const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const JWT_SECRET = "segredo_super_secreto_do_projeto"; 

// --- CONFIGURAÇÃO DO MULTER (FOTOS) ---
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    // Guarda como avatar-ID_DO_USER.extensao para ser único e substituir o anterior
    cb(null, `avatar-${req.user.id}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 2 * 1024 * 1024 } // Limite de 2MB
});

// Middleware de Autenticação Interno
const authMiddleware = (req, res, next) => {
    const tokenHeader = req.header('Authorization');
    if (!tokenHeader) return res.status(401).json({ error: "Acesso negado" });
    try {
        const token = tokenHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "Token inválido" });
    }
};

// --- SCRAPING (IPVC) ---
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 24; 

const ESCOLAS_ESTATICAS = {
  "Escola Superior de Tecnologia e Gestão": "ESTG",
  "Escola Superior de Educação": "ESE",
  "Escola Superior Agrária": "ESA",
  "Escola Superior de Saúde": "ESS",
  "Escola Superior de Ciências Empresariais": "ESCE",
  "Escola Superior de Desporto e Lazer": "ESDL"
};

async function scrapeUrl(url, grau, mapPrincipal) {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const { data } = await axios.get(url, { httpsAgent: agent, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    let currentSchool = null;

    $('*').each((i, element) => {
      if ($(element).parents('footer, .footer, #cookie-law-info-bar').length > 0) return;
      const tag = element.tagName;
      const texto = $(element).text().trim();

      if (['h1', 'h2', 'h3', 'h4', 'strong'].includes(tag)) {
        for (const [nomeCompleto, sigla] of Object.entries(ESCOLAS_ESTATICAS)) {
          if (texto.includes(nomeCompleto)) currentSchool = sigla;
        }
      }

      if (tag === 'a' && currentSchool && texto.length > 5) {
        let textoOriginal = $(element).text();
        const textoLower = textoOriginal.toLowerCase();
        if (textoLower.includes("não abre")) return;
        const ignorar = ["horário", "exame", "candidatura", "contacto", "saber mais", "voltar", "ver mais", "provas", "notícias"];
        if (!ignorar.some(p => textoLower.includes(p))) {
            let nomeLimpo = textoOriginal.split('|')[0];
            const separadores = ["Dupla Titulação", "Profissional", "Abre em", "Edição", "Regime"];
            separadores.forEach(sep => {
                const regex = new RegExp(`${sep}.*`, 'ig');
                nomeLimpo = nomeLimpo.replace(regex, "");
            });
            nomeLimpo = nomeLimpo.replace(/\(APNOR\)/gi, "").replace(/\(Pós-laboral\)/gi, "").replace(/Novo$/i, "").replace(/^Novo\s+/i, "").trim();
            if (nomeLimpo.length > 2) {
                if (!mapPrincipal[currentSchool][grau]) mapPrincipal[currentSchool][grau] = [];
                if (!mapPrincipal[currentSchool][grau].includes(nomeLimpo)) mapPrincipal[currentSchool][grau].push(nomeLimpo);
            }
        }
      }
    });
  } catch (err) { console.error(`❌ Erro a ler ${grau}: ${err.message}`); }
}

router.get("/schools", async (req, res) => {
  const now = Date.now();
  if (cachedData && (now - lastFetchTime < CACHE_DURATION)) return res.json(cachedData);
  const dadosTemp = {};
  Object.values(ESCOLAS_ESTATICAS).forEach(sigla => { dadosTemp[sigla] = {}; });
  await Promise.all([
    scrapeUrl('https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/licenciaturas/', 'Licenciatura', dadosTemp),
    scrapeUrl('https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/mestrados/', 'Mestrado', dadosTemp),
    scrapeUrl('https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/ctesp/', 'CTeSP', dadosTemp),
    scrapeUrl('https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/pos-graduacoes/', 'Pós-Graduação', dadosTemp)
  ]);
  const listaFinal = Object.keys(dadosTemp).map(sigla => ({ nome: sigla, graus: dadosTemp[sigla] }));
  cachedData = listaFinal;
  lastFetchTime = now;
  res.json(cachedData);
});

// --- AUTENTICAÇÃO ---

router.post("/register", async (req, res) => {
    try {
      const { primeiroNome, ultimoNome, email, password, escola, grau, curso, ano } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Dados em falta" });
      const existente = await User.findOne({ email: email.toLowerCase() });
      if (existente) return res.status(400).json({ error: "Email já existe" });
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      const novoUser = new User({
        nome: `${primeiroNome} ${ultimoNome}`, primeiroNome, ultimoNome,
        email: email.toLowerCase(), password: hash, escola, grau, curso, ano 
      });
      await novoUser.save();
      res.json({ message: "Sucesso" });
    } catch (e) { res.status(500).json({ error: "Erro no registo" }); }
});

router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: "Credenciais inválidas" });
      
      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "24h" });
      
      return res.json({  
        token, 
        user: { 
          id: user._id, 
          nome: user.nome, 
          email: user.email, 
          escola: user.escola, 
          grau: user.grau, 
          curso: user.curso, 
          ano: user.ano, 
          foto: user.foto // 🔥 Enviado no login para persistência imediata
        } 
      });
    } catch (e) { res.status(500).json({ error: "Erro no login" }); }
});

// --- PERFIL E FOTO ---

router.put('/update-profile', authMiddleware, async (req, res) => {
    try {
        const { nome, escola, grau, curso, ano } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { nome, escola, grau, curso, ano } },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: "Utilizador não encontrado" });
        res.json({ message: "Perfil atualizado", user });
    } catch (err) {
        res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
});

router.post('/upload-avatar', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nenhum ficheiro enviado" });
        
        // Caminho relativo (ex: /uploads/avatar-65a...jpg)
        const photoUrl = `/uploads/${req.file.filename}`;
        
        await User.findByIdAndUpdate(
            req.user.id,
            { $set: { foto: photoUrl } }
        );

        res.json({ message: "Foto atualizada com sucesso", photoUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao carregar foto" });
    }
});

router.put('/update-password', authMiddleware, async (req, res) => { 
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "User não encontrado" });
        
        const validPass = await bcrypt.compare(currentPassword, user.password);
        if (!validPass) return res.status(400).json({ error: "Password atual incorreta" });
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        res.json({ message: "Password atualizada" });
    } catch (err) { res.status(500).json({ error: "Erro ao atualizar password" }); }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User não encontrado" });
    res.json({ user: {
      id: user._id, 
      nome: user.nome, 
      email: user.email, 
      escola: user.escola, 
      grau: user.grau, 
      curso: user.curso, 
      ano: user.ano, 
      foto: user.foto
    }});
  } catch (err) { res.status(500).json({ error: "Erro ao obter perfil" }); }
});

module.exports = router;