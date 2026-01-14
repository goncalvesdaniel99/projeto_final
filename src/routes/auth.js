const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const JWT_SECRET = "segredo_super_secreto_do_projeto"; 

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

      // 1. Identificar Escola
      if (['h1', 'h2', 'h3', 'h4', 'strong'].includes(tag)) {
        for (const [nomeCompleto, sigla] of Object.entries(ESCOLAS_ESTATICAS)) {
          if (texto.includes(nomeCompleto)) currentSchool = sigla;
        }
      }

      // 2. Apanhar Curso
      if (tag === 'a' && currentSchool && texto.length > 5) {
        let textoOriginal = $(element).text(); // Pega o texto original com formatação
        const textoLower = textoOriginal.toLowerCase();

        // Filtros de exclusão
        if (textoLower.includes("não abre")) return;

        const ignorar = ["horário", "exame", "candidatura", "contacto", "saber mais", "voltar", "ver mais", "provas", "notícias"];
        
        if (!ignorar.some(p => textoLower.includes(p))) {
            
            // --- NOVA LÓGICA DE LIMPEZA ---
            let nomeLimpo = textoOriginal;

            // 1. Cortar pelo pipe '|' (ex: "Engenharia Civil | Não abre")
            nomeLimpo = nomeLimpo.split('|')[0];

            // 2. Cortar por palavras chave que indicam descrição
            // Tudo o que vier depois destas palavras é lixo
            const separadores = [
                "Dupla Titulação", 
                "Profissional", 
                "Abre em", 
                "Edição", 
                "Regime"
            ];

            separadores.forEach(sep => {
                // Regex case-insensitive para cortar a partir da palavra
                const regex = new RegExp(`${sep}.*`, 'ig');
                nomeLimpo = nomeLimpo.replace(regex, "");
            });

            // 3. Remover textos específicos entre parênteses ou soltos
            nomeLimpo = nomeLimpo
                .replace(/\(APNOR\)/gi, "")
                .replace(/\(Pós-laboral\)/gi, "")
                .replace(/Novo$/i, "") // Remove "Novo" apenas no fim
                .replace(/^Novo\s+/i, ""); // Remove "Novo" no início

            // 4. Limpeza final de espaços e quebras de linha
            nomeLimpo = nomeLimpo.trim();

            // Só adiciona se sobrou um nome válido
            if (nomeLimpo.length > 2) {
                if (!mapPrincipal[currentSchool][grau]) mapPrincipal[currentSchool][grau] = [];
                
                if (!mapPrincipal[currentSchool][grau].includes(nomeLimpo)) {
                    mapPrincipal[currentSchool][grau].push(nomeLimpo);
                }
            }
        }
      }
    });
  } catch (err) { console.error(`❌ Erro a ler ${grau}: ${err.message}`); }
}

router.get("/schools", async (req, res) => {
  const now = Date.now();
  if (cachedData && (now - lastFetchTime < CACHE_DURATION)) return res.json(cachedData);

  console.log("🔄 A inicializar estrutura...");
  
  const dadosTemp = {};
  Object.values(ESCOLAS_ESTATICAS).forEach(sigla => { dadosTemp[sigla] = {}; });

  await Promise.all([
    scrapeUrl('https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/licenciaturas/', 'Licenciatura', dadosTemp),
    scrapeUrl('https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/mestrados/', 'Mestrado', dadosTemp),
    scrapeUrl('https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/ctesp/', 'CTeSP', dadosTemp),
    scrapeUrl('https://www.ipvc.pt/estudar/estudar-no-ipvc/cursos/pos-graduacoes/', 'Pós-Graduação', dadosTemp)
  ]);

  const listaFinal = Object.keys(dadosTemp).map(sigla => ({
    nome: sigla,
    graus: dadosTemp[sigla]
  }));

  cachedData = listaFinal;
  lastFetchTime = now;
  
  console.log("✅ Dados limpos e prontos.");
  res.json(cachedData);
});

// ... (Resto das rotas register, login, etc. mantém-se iguais) ...
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
      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "30m" });
      return res.json({  
        token, 
        user: { 
          id: user._id, 
          nome: user.nome, 
          email: user.email, 
          escola: user.escola,
          grau: user.grau,
          curso: user.curso,
          ano: user.ano 
        } 
      });
    } catch (e) { res.status(500).json({ error: "Erro no login" }); }
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
    } catch (err) { res.status(500).json({ error: "Erro ao atualizar" }); }
});

// Rota para devolver dados do utilizador autenticado
router.get('/profile', async (req, res) => {
  const tokenHeader = req.header('Authorization');
  if (!tokenHeader) return res.status(401).json({ error: "Acesso negado" });
  try {
    const token = tokenHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "User não encontrado" });
    res.json({ user: {
      id: user._id,
      nome: user.nome,
      email: user.email,
      escola: user.escola,
      grau: user.grau,
      curso: user.curso,
      ano: user.ano
    }});
  } catch (err) {
    res.status(500).json({ error: "Erro ao obter perfil" });
  }
});

module.exports = router;