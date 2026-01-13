const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const JWT_SECRET = "segredo_super_secreto_do_projeto"; 

// --- 1. CONFIGURAÇÃO DO MULTER (UPLOAD) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // A pasta 'uploads' tem de existir na raiz do backend!
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    // Cria um nome de sistema seguro (timestamp + random + extensão)
    // Isto evita erros no disco se o nome tiver caracteres proibidos pelo SO
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
const auth = (req, res, next) => {
  const token = req.header('auth-token') || req.header('Authorization');
  if (!token) return res.status(401).send('Acesso negado.');
  try {
    const cleanToken = token.replace('Bearer ', '');
    const verified = jwt.verify(cleanToken, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send('Token inválido');
  }
};

// --- 2. ROTA DE UPLOAD DE FICHEIRO ---
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  console.log(">>> 📥 Pedido de Upload recebido!");

  try {
    // 1. Verificações básicas
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum ficheiro enviado." });
    }

    const { groupId } = req.body;
    if (!groupId) {
      return res.status(400).json({ error: "ID do grupo em falta." });
    }

    // 2. CORREÇÃO DE ACENTOS (Encoding Fix)
    // O Multer processa o nome como 'latin1'. Convertemos para 'utf8' para corrigir ç, ã, é.
    const originalNameFixed = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    // 3. CORREÇÃO DE CAMINHOS (Windows vs Web)
    // Substitui contrabarras (\) por barras normais (/) para o URL funcionar no browser/telemóvel
    let fileUrl = req.file.path.replace(/\\/g, "/");
    
    // Garante que o caminho começa por 'uploads/' (por segurança)
    if (!fileUrl.startsWith('uploads/')) {
        fileUrl = 'uploads/' + req.file.filename;
    }

    console.log(`📎 Ficheiro processado: ${originalNameFixed}`);
    console.log(`💾 URL gerado: ${fileUrl}`);

    // 4. Criar a mensagem na Base de Dados
    const newMessage = new Message({
      group: groupId,
      sender: req.user.id,
      // Texto bonito para aparecer no chat
      text: `📎 ${originalNameFixed}`, 
      // Caminho técnico para o download (Importante!)
      fileUrl: fileUrl, 
      type: 'file' 
    });

    const savedMessage = await newMessage.save();
    
    // Popula dados do utilizador
    await savedMessage.populate('sender', 'nome email');

    console.log("✅ Mensagem com anexo gravada com sucesso!");
    res.json(savedMessage);

  } catch (err) {
    console.error("❌ Erro CRÍTICO no upload:", err);
    res.status(500).json({ error: err.message });
  }
});


// --- 3. ENVIAR MENSAGEM DE TEXTO ---
router.post('/send', auth, async (req, res) => {
  try {
    const { groupId, texto } = req.body;

    if (!texto) return res.status(400).json({ error: "Texto obrigatório" });
    if (!groupId) return res.status(400).json({ error: "Grupo obrigatório" });

    const newMessage = new Message({
      group: groupId,     
      sender: req.user.id, 
      text: texto          
    });

    const savedMessage = await newMessage.save();
    await savedMessage.populate('sender', 'nome email');
    
    res.json(savedMessage);

  } catch (err) {
    console.error("❌ Erro ao gravar mensagem:", err);
    res.status(500).json({ error: err.message });
  }
});


// --- 4. LER MENSAGENS ---
router.get('/:groupId', auth, async (req, res) => {
  try {
    const idDoGrupo = req.params.groupId;

    const messages = await Message.find({ group: idDoGrupo }) 
      .populate('sender', 'nome email')
      .sort({ createdAt: 1 }); 

    res.json(messages);
  } catch (err) {
    console.error("❌ Erro ao ler mensagens:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;