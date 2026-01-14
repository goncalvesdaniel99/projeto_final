const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User'); 
const jwt = require('jsonwebtoken');
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const JWT_SECRET = process.env.JWT_SECRET || "segredo_super_secreto_do_projeto";

// --- HELPER ---
const normalize = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

// ==========================================
// 1. LISTA DE CURSOS
// ==========================================
async function scrapeCoursesList(schoolAcronym, degreeType) {
    try {
        const agent = new https.Agent({ rejectUnauthorized: false });
        const headers = { 'User-Agent': 'Mozilla/5.0' };
        let url = 'https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/licenciaturas/';
        const deg = String(degreeType).toLowerCase().trim();
        if (deg.includes('ctesp')) url = 'https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/ctesp/';
        else if (deg.includes('mestrado')) url = 'https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/mestrados/';
        
        const schoolMap = { 'ESTG': 'Tecnologia e Gestão', 'ESE': 'Educação', 'ESA': 'Agrária', 'ESS': 'Saúde', 'ESCE': 'Ciências Empresariais', 'ESDL': 'Desporto e Lazer' };
        const targetSchoolName = schoolMap[schoolAcronym];

        const { data } = await axios.get(url, { httpsAgent: agent, headers });
        const $ = cheerio.load(data);
        const courses = new Set();

        const schoolSection = $('h1, h2, h3, h4, .elementor-tab-title').filter((i, el) => 
            $(el).text().includes(targetSchoolName)
        ).first();

        if (schoolSection.length > 0) {
            let container = schoolSection.parent().parent(); 
            if (schoolSection.hasClass('elementor-tab-title')) {
                container = schoolSection.next('.elementor-tab-content');
            }

            container.find('a[href*="/cursos/"]').each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 5 && !text.includes(targetSchoolName)) {
                    let clean = text.split('|')[0].split(/Não abre/i)[0].replace(/[-–]\s*Novo/i, '').trim();
                    if (clean) courses.add(clean);
                }
            });
        }
        return Array.from(courses).sort();
    } catch (error) { return []; }
}

// ==========================================
// 2. DISCIPLINAS (CORRIGIDO: FILTRO INTELIGENTE)
// ==========================================
async function scrapeSubjectsForCourse(courseName, degreeType = "Licenciatura") {
  console.log(`\n🔄 [SCRAPING] A procurar: "${courseName}"`);
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
    const searchTarget = normalize(courseName); // ex: "enfermagem"

    // 🔥 LÓGICA DE PROCURA CORRIGIDA 🔥
    $main('a').each((i, el) => {
      const text = normalize($main(el).text()); // ex: "licenciatura em enfermagem" ou "enfermagem veterinaria"
      const href = $main(el).attr('href');

      if (!href || !href.includes('/cursos/')) return; // Ignora links que não sejam cursos

      // 1. Se procuramos "Enfermagem", IGNORAR "Veterinária"
      if (searchTarget === 'enfermagem' && text.includes('veterinaria')) {
          return; // Salta este link
      }

      // 2. Verifica se contém o nome (Ex: "Licenciatura em Enfermagem" contém "enfermagem")
      if (text.includes(searchTarget)) {
        courseUrl = href;
        return false; // Encontrámos, paramos o loop.
      }
    });

    if (!courseUrl) throw new Error("Link não encontrado para: " + courseName);

    let planUrl = courseUrl.includes('?') ? `${courseUrl}&tab=tab-planoestudos` : `${courseUrl}?tab=tab-planoestudos`;
    const { data: planData } = await axios.get(planUrl, { httpsAgent: agent, headers });
    const $ = cheerio.load(planData);

    // Inicializa os 4 anos
    const result = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
    
    const container = $('.course_unit-list-box');
    
    container.find('.grid-002_title').each((idx, titleEl) => {
        const $title = $(titleEl);
        const titleText = $title.text().toLowerCase();
        
        let year = 1;
        if (titleText.includes('2º ano') || titleText.includes('2.º ano')) year = 2;
        else if (titleText.includes('3º ano') || titleText.includes('3.º ano')) year = 3;
        else if (titleText.includes('4º ano') || titleText.includes('4.º ano')) year = 4;

        const tableContainer = $title.next('.grid-002_table');
        
        tableContainer.find('table tr').each((rIdx, row) => {
            const $cells = $(row).find('th, td');
            if ($cells.length === 0) return;

            $cells.each((cIdx, cell) => {
                const raw = $(cell).text().trim();
                if (isValidSubject(raw)) {
                    const clean = raw.replace(/^\d+\s+/, '').replace(/^[0-9]+\s+/, '').trim();
                    result[year].add(clean);
                    return false; 
                }
            });
        });
    });

    // Fallback para layouts antigos
    if (result[1].size === 0 && result[2].size === 0 && result[3].size === 0) {
        $('table').each((i, tbl) => {
            const txt = $(tbl).text().toLowerCase();
            if(txt.includes('equivalencia')) return;

            let y = 1;
            const prev = $(tbl).prevAll().text().toLowerCase();
            
            if(prev.includes('2.º ano') || prev.includes('2º ano')) y = 2;
            else if(prev.includes('3.º ano') || prev.includes('3º ano')) y = 3;
            else if(prev.includes('4.º ano') || prev.includes('4º ano')) y = 4; 

            $(tbl).find('tr').each((k, row) => {
                $(row).find('th, td').each((j, cell) => {
                    const t = $(cell).text().trim();
                    if(isValidSubject(t)) {
                        result[y].add(t.replace(/^\d+\s+/, '').trim());
                        return false; 
                    }
                });
            });
        });
    }

    const finalData = { 
        1: Array.from(result[1]).sort(), 
        2: Array.from(result[2]).sort(), 
        3: Array.from(result[3]).sort(),
        4: Array.from(result[4]).sort()
    };
    
    console.log(`   ✅ Encontradas disciplinas (Total: ${finalData[1].length + finalData[2].length + finalData[3].length + finalData[4].length})`);
    return finalData;

  } catch (error) { 
    console.error("❌ Erro:", error.message);
    return { 1: [], 2: [], 3: [], 4: [] }; 
  }
}

function isValidSubject(text) {
    if (!text || text.length < 4) return false;
    const lower = text.toLowerCase();
    
    if (text.includes(':') && /\d/.test(text)) return false; 
    if (!isNaN(text.replace(',', '.'))) return false; 
    if (text === text.toUpperCase() && text.length < 6) return false; 

    const black = ["semestre", "ects", "unidade", "curricular", "total", "docente", "consultar", "área", "plano de estudos", "tipo", "horário"];
    return !black.some(b => lower.includes(b));
}

// --- MIDDLEWARE ---
function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send();
    try {
      req.user = jwt.verify(authHeader.replace("Bearer ", ""), JWT_SECRET);
      next();
    } catch (err) { res.status(401).send(); }
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

router.get('/my', verificarToken, async (req, res) => {
    const grupos = await Group.find({ membros: req.user.id }).populate('criador membros', 'nome email');
    res.json(grupos);
});

router.get('/all', async (req, res) => {
    const grupos = await Group.find().populate('criador membros', 'nome');
    res.json(grupos.map(g => ({ ...g.toObject(), ocupacao: `${g.membros.length}/${g.maxPessoas}` })));
});

router.get("/info/:id", verificarToken, async (req, res) => {
    try {
        if (!req.params.id || req.params.id === 'undefined') {
            return res.status(400).json({ error: "ID inválido" });
        }
        const grupo = await Group.findById(req.params.id).populate("criador membros", "nome email");
        if (!grupo) return res.status(404).json({ error: "Grupo não encontrado" });
        res.json(grupo);
    } catch (err) {
        console.error("Erro no /info/:id ->", err.message);
        res.status(500).json({ error: "Erro no servidor" });
    }
});

router.post('/join/:id', verificarToken, async (req, res) => {
    const grupo = await Group.findById(req.params.id);
    if (grupo && !grupo.membros.includes(req.user.id)) {
        grupo.membros.push(req.user.id);
        await grupo.save();
    }
    res.json({ message: "OK" });
});

router.post('/leave/:id', verificarToken, async (req, res) => {
    try {
        const grupo = await Group.findById(req.params.id);
        if (!grupo) return res.status(404).send();
        
        if (grupo.membros.length <= 1) {
            await Group.findByIdAndDelete(req.params.id);
        } else {
            grupo.membros = grupo.membros.filter(m => String(m) !== String(req.user.id));
            await grupo.save();
        }
        res.json({ message: "OK" });
    } catch (err) { res.status(500).json({ error: "Erro" }); }
});

router.delete('/:id', verificarToken, async (req, res) => {
    try {
        const grupo = await Group.findById(req.params.id);
        if (!grupo) return res.status(404).json({ error: "Grupo não encontrado" });

        if (String(grupo.criador) !== String(req.user.id)) {
            return res.status(403).json({ error: "Apenas o administrador pode eliminar o grupo." });
        }

        await Group.findByIdAndDelete(req.params.id);
        res.json({ message: "Grupo eliminado com sucesso." });
    } catch (err) {
        res.status(500).json({ error: "Erro ao eliminar grupo." });
    }
});

module.exports = router;