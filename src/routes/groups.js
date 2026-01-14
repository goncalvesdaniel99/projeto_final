const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User'); 
const jwt = require('jsonwebtoken');
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

let Meeting;
try { Meeting = require('../models/Meeting'); } catch (e) {}

const JWT_SECRET = "segredo_super_secreto_do_projeto";
let subjectsCache = {}; 

// ==========================================
//  1. LISTA DE CURSOS
// ==========================================
async function scrapeCoursesList(schoolAcronym, degreeType) {
    try {
        const agent = new https.Agent({ rejectUnauthorized: false });
        const headers = { 'User-Agent': 'Mozilla/5.0' };

        let url = 'https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/licenciaturas/';
        const deg = String(degreeType).toLowerCase().trim();
        if (deg.includes('ctesp')) url = 'https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/ctesp/';
        else if (deg.includes('mestrado')) url = 'https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/mestrados/';
        
        const schoolMap = {
            'ESTG': 'Escola Superior de Tecnologia e Gestão',
            'ESE': 'Escola Superior de Educação',
            'ESA': 'Escola Superior Agrária',
            'ESS': 'Escola Superior de Saúde',
            'ESCE': 'Escola Superior de Ciências Empresariais',
            'ESDL': 'Escola Superior de Desporto e Lazer'
        };
        const targetSchoolName = schoolMap[schoolAcronym];

        const { data } = await axios.get(url, { httpsAgent: agent, headers });
        const $ = cheerio.load(data);
        const courses = new Set();

        const schoolTitle = $('h1, h2, h3, h4, .elementor-tab-title').filter((i, el) => 
            $(el).text().trim().includes(targetSchoolName)
        ).first();

        if (schoolTitle.length > 0) {
            let container = schoolTitle.hasClass('elementor-tab-title') ? 
                schoolTitle.next('.elementor-tab-content') : schoolTitle.parent();

            for (let i = 0; i < 3; i++) {
                if (container.find('a[href*="/cursos/"]').length > 0) break;
                container = container.parent();
            }

            container.find('a').each((i, el) => {
                const text = $(el).text().trim();
                const href = $(el).attr('href');
                if (href && href.includes('/cursos/') && text.length > 5 && !text.includes(targetSchoolName)) {
                    courses.add(text.replace(/^-/, '').trim());
                }
            });
        }
        return Array.from(courses).sort();
    } catch (error) { return []; }
}

// ==========================================
//  2. DISCIPLINAS (Lógica de Extração)
// ==========================================
async function scrapeSubjectsForCourse(courseName, degreeType = "Licenciatura") {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const headers = { 'User-Agent': 'Mozilla/5.0' };

    let baseUrl = 'https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/licenciaturas/';
    const deg = String(degreeType).toLowerCase();
    if (deg.includes('ctesp')) baseUrl = 'https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/ctesp/';
    else if (deg.includes('mestrado')) baseUrl = 'https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/mestrados/';

    const { data: mainData } = await axios.get(baseUrl, { httpsAgent: agent, headers });
    const $main = cheerio.load(mainData);

    let courseUrl = null;
    const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const searchClean = normalize(courseName).replace("licenciatura em ", "").replace("mestrado em ", "").replace("ctesp em ", "");

    $main('a').each((i, el) => {
      const text = normalize($main(el).text());
      if (text.includes(searchClean)) {
        courseUrl = $main(el).attr('href');
        return false; 
      }
    });

    if (!courseUrl) throw new Error("Não encontrado");

    let planUrl = courseUrl.includes('?') ? `${courseUrl}&tab=tab-planoestudos` : `${courseUrl}?tab=tab-planoestudos`;
    const { data: planData } = await axios.get(planUrl, { httpsAgent: agent, headers });
    const $ = cheerio.load(planData);

    const allSubjectsOrdered = []; 
    const result = { 1: new Set(), 2: new Set(), 3: new Set() };
    let currentYear = 1; 

    $('body').find('h1, h2, h3, h4, h5, h6, table, strong, span, p, div').each((i, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text === '1.º ano' || text === '1º ano') currentYear = 1;
        else if (text === '2.º ano' || text === '2º ano') currentYear = 2;
        else if (text === '3.º ano' || text === '3º ano') currentYear = 3;

        if (el.tagName.toLowerCase() === 'table') {
            $(el).find('tr').each((rowIdx, row) => {
                $(row).find('td, th').each((cellIdx, cell) => {
                    const cellText = $(cell).text().trim();
                    if (isValidSubject(cellText)) {
                        const clean = cellText.replace(/^[0-9]+\s+/, '').replace(/^\d+\s+/, '').trim();
                        if (allSubjectsOrdered[allSubjectsOrdered.length - 1] !== clean) {
                            allSubjectsOrdered.push(clean);
                        }
                        result[currentYear].add(clean);
                    }
                });
            });
        }
    });

    const finalData = { 1: [], 2: [], 3: [] };
    if (result[2].size > 0) {
         finalData[1] = Array.from(result[1]).sort();
         finalData[2] = Array.from(result[2]).sort();
         finalData[3] = Array.from(result[3]).sort();
    } else {
        const total = allSubjectsOrdered.length;
        const divisor = deg.includes('ctesp') || deg.includes('mestrado') ? 2 : 3;
        const chunk = Math.ceil(total / divisor);
        finalData[1] = allSubjectsOrdered.slice(0, chunk).sort();
        finalData[2] = allSubjectsOrdered.slice(chunk, chunk * 2).sort();
        finalData[3] = allSubjectsOrdered.slice(chunk * 2).sort();
    }
    return finalData;
  } catch (error) { return { 1: [], 2: [], 3: [] }; }
}

// ==========================================
//  FUNÇÃO DE VALIDAÇÃO (LIMPEZA TOTAL)
// ==========================================
function isValidSubject(text) {
    if (!text || text.length < 4) return false; 
    
    const lower = text.toLowerCase().trim();

    // 1. Bloqueia Cargas Horárias (ex: TP:32.00) e siglas maiúsculas (ex: MAT)
    if (text.includes(':') && /\d/.test(text)) return false;
    if (text === text.toUpperCase() && text.length < 6 && !text.includes(' ')) return false;

    // 2. Bloqueia números e créditos
    if (!isNaN(text.replace(',', '').replace('.', ''))) return false;

    // 3. Blacklist de Termos indesejados (Área adicionada aqui)
    const blacklist = [
        "semestre", "ects", "unidade", "curricular", "horas", "total", "código", 
        "científica", "estágio", "ano", "tipo", "regime", "docente", "ver plano",
        "consultar", "tipologia", "observações", "saber mais", "candidatura",
        "horário de contacto", "horário", "estudar no ipvc", "voltar", "área"
    ];

    if (blacklist.some(bad => lower === bad || lower.includes(bad))) return false;

    return true;
}

// --- ROTAS ---

router.get("/list-courses", async (req, res) => {
    const courses = await scrapeCoursesList(req.query.school, req.query.degree);
    res.json(courses);
});

router.get("/subjects", async (req, res) => {
  const data = await scrapeSubjectsForCourse(req.query.course, req.query.degree);
  res.json(data);
});

router.post('/create', verificarToken, async (req, res) => {
    try {
      const { curso, ano, disciplina, maxPessoas, grau } = req.body;
      const grupo = new Group({ curso, ano, disciplina, maxPessoas, grau, membros: [req.user.id], criador: req.user.id });
      await grupo.save();
      res.json({ message: "Grupo criado!", grupo });
    } catch (err) { res.status(500).json({ error: "Erro" }); }
});

function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send();
    try {
      req.user = jwt.verify(authHeader.replace("Bearer ", ""), JWT_SECRET);
      next();
    } catch (err) { res.status(401).send(); }
}

router.get('/my', verificarToken, async (req, res) => {
    const grupos = await Group.find({ membros: req.user.id }).populate('criador membros', 'nome email');
    res.json(grupos);
});

router.get('/all', async (req, res) => {
    const grupos = await Group.find().populate('criador membros', 'nome');
    res.json(grupos.map(g => ({ ...g.toObject(), ocupacao: `${g.membros.length}/${g.maxPessoas}` })));
});

router.get("/info/:id", verificarToken, async (req, res) => {
    const grupo = await Group.findById(req.params.id).populate("criador membros", "nome email");
    res.json(grupo);
});

router.post('/join/:id', verificarToken, async (req, res) => {
    const grupo = await Group.findById(req.params.id);
    if (!grupo.membros.includes(req.user.id)) {
        grupo.membros.push(req.user.id);
        await grupo.save();
    }
    res.json({ message: "OK" });
});

router.post('/leave/:id', verificarToken, async (req, res) => {
    const grupo = await Group.findById(req.params.id);
    if (String(grupo.criador) === String(req.user.id) && grupo.membros.length === 1) {
        await Group.findByIdAndDelete(req.params.id);
    } else {
        grupo.membros = grupo.membros.filter(m => String(m) !== String(req.user.id));
        await grupo.save();
    }
    res.json({ message: "OK" });
});

module.exports = router;