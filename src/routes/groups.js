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
//  FUNÇÃO DE SCRAPING: RAIO-X FOCADO
// ==========================================
async function scrapeSubjectsForCourse(courseName) {
  console.log(`\n🔄 [SCRAPING] A procurar disciplinas para: "${courseName}"`);
  
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    // --- 1. ENCONTRAR O LINK ---
    const mainUrl = 'https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/licenciaturas/';
    const { data: mainData } = await axios.get(mainUrl, { httpsAgent: agent, headers });
    const $main = cheerio.load(mainData);

    let courseUrl = null;
    const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/licenciatura em/g, "").trim();
    const searchClean = normalize(courseName);

    $main('a').each((i, el) => {
      const text = $main(el).text();
      const href = $main(el).attr('href');
      if (!text || !href) return;
      if (normalize(text).includes(searchClean)) {
        courseUrl = href;
        return false; 
      }
    });

    if (!courseUrl) throw new Error("Link não encontrado.");
    console.log(`   🔗 Link: ${courseUrl}`);
    
    // --- 2. LER PÁGINA ---
    const { data: courseData } = await axios.get(courseUrl, { httpsAgent: agent, headers });
    const $ = cheerio.load(courseData);

    // 🔥 REMOVER MENUS E SIDEBARS 🔥
    // Isto garante que o lixo ("Renovação", "Bolsas") desaparece
    $('#sidebar, .widget-area, footer, header, nav').remove();
    $('.elementor-location-header, .elementor-location-footer').remove();

    const result = { 1: new Set(), 2: new Set(), 3: new Set() };
    
    // --- 3. ESTRATÉGIA: ENCONTRAR TABELAS NO CONTEÚDO ---
    // Procuramos tabelas apenas dentro de wrappers de conteúdo, não na página toda
    const contentArea = $('.entry-content, .elementor-section-wrap, main');
    const tables = contentArea.find('table');

    if (tables.length > 0) {
        console.log(`   📊 Encontradas ${tables.length} tabelas.`);
        
        tables.each((i, table) => {
            const $table = $(table);
            
            // Tenta adivinhar o ano olhando para Títulos ANTES da tabela
            let year = 0;
            // Verifica os 5 elementos anteriores
            let prev = $table.parents('.elementor-widget').prev(); 
            if (prev.length === 0) prev = $table.prev(); // Fallback

            for(let k=0; k<5; k++) {
                const txt = prev.text().toLowerCase();
                if (txt.includes('1.º') || txt.includes('1º') || txt.includes('1.o')) { year = 1; break; }
                if (txt.includes('2.º') || txt.includes('2º') || txt.includes('2.o')) { year = 2; break; }
                if (txt.includes('3.º') || txt.includes('3º') || txt.includes('3.o')) { year = 3; break; }
                prev = prev.prev();
            }

            // Se não encontrou ano, assume sequencial
            if (year === 0) year = (i % 3) + 1;

            // Extrair linhas
            $table.find('tr').each((rowIdx, row) => {
                const tds = $(row).find('td');
                if (tds.length > 0) {
                    // Pega o texto da 1ª coluna
                    let text = $(tds[0]).text().trim();
                    
                    // Se for código (ex: 12345), pega a 2ª coluna
                    if ((/^\d+$/.test(text) || text.length < 4) && tds.length > 1) {
                        text = $(tds[1]).text().trim();
                    }

                    if (isValidSubject(text)) {
                        result[year].add(cleanName(text));
                    }
                }
            });
        });
    } else {
        // --- 4. FALLBACK: LISTAS (UL/LI) ---
        // Só corre se não houver tabelas (para cursos como Design que às vezes usam listas)
        console.log("   ⚠️ Sem tabelas. A verificar listas...");
        contentArea.find('.elementor-tab-content li, ul li').each((i, li) => {
            const text = $(li).text().trim();
            // Validação extra para garantir que não é menu
            if (isValidSubject(text) && $(li).parents('nav').length === 0) {
                // Tenta meter tudo no ano 1 se não soubermos
                result[1].add(cleanName(text));
            }
        });
    }

    // --- 5. RESPOSTA ---
    const finalData = {
        1: Array.from(result[1]).sort(),
        2: Array.from(result[2]).sort(),
        3: Array.from(result[3]).sort()
    };

    const total = finalData[1].length + finalData[2].length + finalData[3].length;
    console.log(`   📦 Total disciplinas: ${total}`);

    // Distribuição de emergência
    if (total > 5 && finalData[2].length === 0) {
        const all = [...finalData[1], ...finalData[2], ...finalData[3]];
        const chunk = Math.ceil(all.length / 3);
        finalData[1] = all.slice(0, chunk);
        finalData[2] = all.slice(chunk, chunk * 2);
        finalData[3] = all.slice(chunk * 2);
    }

    if (total === 0) throw new Error("Zero disciplinas.");

    return finalData;

  } catch (error) {
    console.error("❌ ERRO SCRAPING:", error.message);
    return null;
  }
}

function cleanName(text) {
    return text.replace(/^[0-9]+\s+/, '').replace(/^\d+\s+/, '').trim();
}

function isValidSubject(text) {
    if (!text || text.length < 3) return false;
    const lower = text.toLowerCase();
    
    // Blacklist atualizada
    const blacklist = [
      "semestre", "ects", "créditos", "obrigatória", "opcional", "horas", 
      "total", "unidade curricular", "código", "área", "científica",
      "contacto", "presencial", "estágio", "projeto", "ano", "ver mais",
      "consultar", "pl:", "tp:", "ot:", "saber mais", "plano de estudos",
      "duração", "regime", "tipo", "docente", "email", "objectivos",
      "avaliar", "frequência", "teórico", "prático", "laboratorial",
      "política", "cookies", "privacidade", "mapa do site", "subscrever",
      "renovação", "inscrição", "suplemento", "diploma", "viver no distrito",
      "sugestões", "elogios", "reclamações", "webmail", "on.ipvc",
      "serviços", "ação social", "internacional", "bibliotecas", "agenda",
      "propinas", "candidaturas", "bolsas", "regulamentos", "avisos"
    ];

    if (text.includes(":") || !isNaN(text)) return false; 
    if (blacklist.some(bad => lower.includes(bad))) return false;
    if (text.split(' ').length > 10) return false; 

    return true;
}

// =========================
// ROTAS
// =========================
router.get("/subjects", async (req, res) => {
  const { course } = req.query;
  if (!course) return res.status(400).json({ error: "Curso obrigatório" });
  if (subjectsCache[course]) return res.json(subjectsCache[course]);

  const data = await scrapeSubjectsForCourse(course);

  if (data) {
    subjectsCache[course] = data;
    return res.json(data);
  } else {
    // BACKUP IDENTIFICÁVEL
    return res.json({
      1: ["Matemática (Backup)", "Introdução (Backup)"], 
      2: ["Tecnologias (Backup)", "Desenvolvimento (Backup)"],
      3: ["Projeto Final (Backup)", "Estágio (Backup)"]
    });
  }
});

// Middlewares e Rotas CRUD (Mantêm-se iguais)
function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization || req.headers['auth-token'];
    if (!authHeader) return res.status(401).json({ error: "Token não fornecido" });
    try {
      const decoded = jwt.verify(authHeader.replace("Bearer ", ""), JWT_SECRET);
      req.user = decoded; 
      next();
    } catch (err) { return res.status(401).json({ error: "Token inválido" }); }
}

router.post('/create', verificarToken, async (req, res) => {
    try {
      const { curso, ano, disciplina, maxPessoas } = req.body;
      if (!curso || !ano || !disciplina || !maxPessoas) return res.status(400).json({ error: "Campos incompletos." });
      const grupo = new Group({
        curso, ano, disciplina, maxPessoas,
        membros: [req.user.id], criador: req.user.id,
      });
      await grupo.save();
      res.json({ message: "Grupo criado com sucesso!", grupo });
    } catch (err) { res.status(500).json({ error: "Erro ao criar grupo." }); }
});

router.get('/my', verificarToken, async (req, res) => {
    try {
      const grupos = await Group.find({ membros: req.user.id || req.user._id })
        .populate('criador', 'nome email').populate('membros', 'nome email');
      res.json(grupos);
    } catch (err) { res.status(500).json({ error: "Erro." }); }
});

router.get('/all', async (req, res) => {
    try {
      const grupos = await Group.find().populate('criador', 'nome').populate('membros', 'nome');
      const final = grupos.map(g => ({ ...g.toObject(), ocupacao: `${g.membros.length}/${g.maxPessoas}` }));
      res.json(final);
    } catch (err) { res.status(500).json({ error: "Erro." }); }
});

router.post('/join/:id', verificarToken, async (req, res) => {
    try {
      const grupo = await Group.findById(req.params.id);
      if (!grupo) return res.status(404).json({ error: "N/A" });
      if (grupo.membros.includes(req.user.id)) return res.status(400).json({ error: "Já és membro." });
      grupo.membros.push(req.user.id);
      await grupo.save();
      res.json({ message: "Entraste!" });
    } catch (err) { res.status(500).json({ error: "Erro." }); }
});

router.post('/leave/:id', verificarToken, async (req, res) => {
      try {
        const groupId = req.params.id;
        const userId = req.user.id;
        const grupo = await Group.findById(groupId);
        if (!grupo) return res.status(404).json({ error: "Grupo não encontrado." });
        const isCreator = String(grupo.criador) === String(userId);
        if (!grupo.membros.some(m => String(m) === String(userId))) return res.status(400).json({ error: "Não estás no grupo." });
        if (isCreator && grupo.membros.length === 1) {
          if(Meeting) await Meeting.deleteMany({ group: groupId });
          await Group.findByIdAndDelete(groupId);
          return res.json({ deleted: true, message: "Grupo eliminado." });
        }
        if (isCreator && grupo.membros.length > 1) {
           return res.status(409).json({ confirmDelete: true, message: "O criador deve eliminar o grupo." });
        }
        grupo.membros = grupo.membros.filter((m) => String(m) !== String(userId));
        await grupo.save();
        return res.json({ left: true, message: "Saíste do grupo." });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
});

router.get('/debug/check-db', async (req, res) => {
    try {
      const allGroups = await Group.find();
      const allUsers = await User.find();
      res.json({ TOTAL_USERS: allUsers.length, TOTAL_GROUPS: allGroups.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;