const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // <--- IMPORTANTE: Instalar com 'npm install bcryptjs'

// Certifica-te que o caminho para o User está correto
const User = require("../models/User");

// --- A CHAVE SECRETA ---
const JWT_SECRET = "segredo_super_secreto_do_projeto"; 

// =========================
//  POST /auth/login
// =========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e password são obrigatórios." });
    }

    const emailNorm = email.trim().toLowerCase();

    // Procura o utilizador (incluindo a password para verificar)
    const user = await User.findOne({ email: emailNorm });

    if (!user) {
      return res.status(400).json({ error: "Credenciais inválidas." });
    }

    // --- VERIFICAÇÃO COM BCRYPT (SEGURA) ---
    // Compara a password escrita com o hash guardado na BD
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ error: "Credenciais inválidas." });
    }

    // Cria o Token
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      JWT_SECRET, 
      { expiresIn: "30m" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        escola: user.escola,
        ano: user.ano,
        curso: user.curso,
      },
    });
  } catch (err) {
    console.error("ERRO NO LOGIN:", err);
    return res.status(500).json({ error: "Erro no login." });
  }
});

// =========================
//  POST /auth/register
// =========================
router.post("/register", async (req, res) => {
  try {
    const {
      primeiroNome,
      ultimoNome,
      email,
      password,
      escola,
      ano,
      curso,
    } = req.body;

    // Validação básica
    if (!primeiroNome || !ultimoNome || !email || !password || !escola || !ano || !curso) {
      return res.status(400).json({ error: "Preenche todos os campos." });
    }

    const emailNorm = email.trim().toLowerCase();

    // Ver se já existe
    const existente = await User.findOne({ email: emailNorm });
    if (existente) {
      return res.status(400).json({ error: "Email já está registado." });
    }

    // --- ENCRIPTAR PASSWORD ANTES DE SALVAR ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const anoNum = Number(ano) || 0;

    const novoUser = new User({
      nome: `${primeiroNome} ${ultimoNome}`,
      primeiroNome,
      ultimoNome,
      email: emailNorm,
      password: hashedPassword, // Salva a versão encriptada
      escola,
      ano: anoNum,
      curso,
    });

    await novoUser.save();

    return res.json({ message: "Conta criada com sucesso." });
  } catch (err) {
    console.error("ERRO NO REGISTO:", err);
    return res.status(500).json({ error: "Erro no registo.", details: err.message });
  }
});

// =========================
//  PUT /auth/update-password (NOVA ROTA)
// =========================
router.put('/update-password', async (req, res) => {
  // Ler o token do cabeçalho
  const tokenHeader = req.header('Authorization');
  if (!tokenHeader) return res.status(401).json({ error: "Acesso negado" });

  try {
    // Verificar Token e Obter ID do User
    const token = tokenHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const { currentPassword, newPassword } = req.body;

    // Buscar utilizador à BD
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Utilizador não encontrado" });

    // 1. Verificar se a password ATUAL está correta
    const validPass = await bcrypt.compare(currentPassword, user.password);
    if (!validPass) {
      return res.status(400).json({ error: "A password atual está incorreta." });
    }

    // 2. Encriptar a NOVA password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 3. Atualizar na BD
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password atualizada com sucesso!" });

  } catch (err) {
    console.error("Erro update-password:", err);
    res.status(500).json({ error: "Erro ao atualizar password." });
  }
});

module.exports = router;