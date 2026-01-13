const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// --- DEPENDÊNCIAS ---
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const JWT_SECRET = "segredo_super_secreto_do_projeto"; 

// --- CACHE ---
let cachedEscolas = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 Horas

// ==========================================
//  FUNÇÃO AUXILIAR DE SCRAPING (AFINADA)
// ==========================================
async function scrapeIPVCData() {
  console.log("🔄 [DEBUG] A iniciar leitura do site IPVC...");
  try {
    const url = 'https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/licenciaturas/';
    
    // Ignorar erros de certificado SSL
    const agent = new https.Agent({ rejectUnauthorized: false });

    const { data } = await axios.get(url, {
      httpsAgent: agent,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const $ = cheerio.load(data);
    const escolasMap = {
      "ESTG": [], "ESE": [], "ESA": [], "ESS": [], "ESCE": [], "ESDL": []
    };

    let currentSchool = null;

    // Títulos exatos para detetar a mudança de escola
    const titulosEscolas = {
      "Escola Superior de Tecnologia e Gestão": "ESTG",
      "Escola Superior de Educação": "ESE",
      "Escola Superior Agrária": "ESA",
      "Escola Superior de Saúde": "ESS",
      "Escola Superior de Ciências Empresariais": "ESCE",
      "Escola Superior de Desporto e Lazer": "ESDL"
    };

    // Percorrer elementos
    $('*').each((i, element) => {
      // 1. REGRA DE OURO: Se estiver dentro do Rodapé ou Cookies, ignorar imediatamente!
      if ($(element).parents('footer, .footer, #footer, .cookie-law-info-bar, #cookie-law-info-bar, .cli-modal').length > 0) {
        return; 
      }

      const tag = element.tagName;
      const texto = $(element).text().trim();

      // Detetar cabeçalhos das escolas
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong'].includes(tag)) {
        for (const [nomeCompleto, sigla] of Object.entries(titulosEscolas)) {
          if (texto.includes(nomeCompleto)) {
            currentSchool = sigla;
          }
        }
      }

      // Detetar Cursos (Links)
      if (tag === 'a' && currentSchool && texto.length > 5) {
        
        // 2. LISTA NEGRA: Palavras a ignorar (baseado no teu print)
        const ignorar = [
          "horário", "exame", "calendário", "candidatura", "contacto", 
          "facebook", "instagram", "twitter", "linkedin", "youtube",
          "política", "cookies", "voltar", "home", "geral", "presidência",
          "aceitar", "guardar", "definições", "fichas", "acessibilidade", 
          "denúncias", "ficha técnica", "mapa do site", "privacidade", "termos",
          "subscrever", "search", "procurar", "saber mais", "ver mais"
        ];
        
        const textoLower = texto.toLowerCase();

        // Só adiciona se NÃO tiver nenhuma palavra proibida
        if (!ignorar.some(palavra => textoLower.includes(palavra))) {
            // Limpeza extra (remover pipes | ou coisas estranhas se houver)
            const nomeLimpo = texto.split('|')[0].trim(); 

            // Evitar duplicados
            if (!escolasMap[currentSchool].includes(nomeLimpo)) {
                escolasMap[currentSchool].push(nomeLimpo);
            }
        }
      }
    });

    const listaFinal = Object.keys(escolasMap).map(sigla => ({
        nome: sigla,
        cursos: escolasMap[sigla].sort()
    })).filter(e => e.cursos.length > 0);

    console.log(`✅ [DEBUG] Scraping limpo. Encontradas ${listaFinal.length} escolas.`);
    
    if (listaFinal.length === 0) throw new Error("Zero cursos detetados.");

    return listaFinal;

  } catch (error) {
    console.error("❌ [ERRO SCRAPING]:", error.message);
    return [
      { nome: "ESTG (Offline)", cursos: ["Engenharia Informática", "Design", "Gestão"] },
      { nome: "ESE (Offline)", cursos: ["Educação Básica"] }
    ];
  }
}

// =========================
//  ROTAS
// =========================
router.get("/schools", async (req, res) => {
  const now = Date.now();
  // Se tiver cache válida, usa-a
  if (cachedEscolas && (now - lastFetchTime < CACHE_DURATION)) {
    return res.json(cachedEscolas);
  }
  // Se não, vai buscar
  const dados = await scrapeIPVCData();
  if (dados.length > 0) {
    cachedEscolas = dados;
    lastFetchTime = now;
  }
  res.json(cachedEscolas || []);
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Dados em falta" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ error: "Credenciais inválidas" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Credenciais inválidas" });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "30m" });
    return res.json({ token, user: { id: user._id, nome: user.nome, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: "Erro no login" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { primeiroNome, ultimoNome, email, password, escola, curso, ano } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Dados em falta" });

    const existente = await User.findOne({ email: email.toLowerCase() });
    if (existente) return res.status(400).json({ error: "Email já existe" });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const novoUser = new User({
      nome: `${primeiroNome} ${ultimoNome}`, primeiroNome, ultimoNome,
      email: email.toLowerCase(), password: hash, escola, curso, ano
    });
    await novoUser.save();
    res.json({ message: "Sucesso" });
  } catch (e) {
    res.status(500).json({ error: "Erro no registo" });
  }
});

router.put('/update-password', async (req, res) => {
  const tokenHeader = req.header('Authorization');
  if (!tokenHeader) return res.status(401).json({ error: "Acesso negado" });

  try {
    const token = tokenHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "User não encontrado" });

    const validPass = await bcrypt.compare(currentPassword, user.password);
    if (!validPass) return res.status(400).json({ error: "Password incorreta" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: "Password atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar" });
  }
});

module.exports = router;