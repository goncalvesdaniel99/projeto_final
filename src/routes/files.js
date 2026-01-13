const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// --- MUDANÇA IMPORTANTE: Usamos o Message em vez do File ---
const Message = require("../models/Message");
const Group = require("../models/Group");

const JWT_SECRET = "segredo_super_secreto_do_projeto"; 

// -------------------------
// Middleware de autenticação
// -------------------------
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// Configuração básica de diretoria (para downloads)
const uploadDir = path.join(__dirname, "..", "..", "uploads");

// -------------------------
// GET /files/group/:groupId -> AGORA BUSCA AS MENSAGENS COM FICHEIROS
// -------------------------
router.get("/group/:groupId", verificarToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // 1. Verificar permissões
    const grupo = await Group.findById(groupId);
    if (!grupo) return res.status(404).json({ error: "Grupo não encontrado." });

    const isMember = grupo.membros.some((m) => String(m) === String(userId));
    if (!isMember) return res.status(403).json({ error: "Não pertences a este grupo." });

    // 2. BUSCAR NO MODELO 'MESSAGE' (em vez de File)
    // Filtramos por type: 'file'
    const messages = await Message.find({ group: groupId, type: 'file' })
      .sort({ createdAt: -1 })
      .populate("sender", "nome email");

    // 3. TRANSFORMAR DADOS
    // O frontend espera { title, uploader, ... }, mas a mensagem tem { text, sender, ... }
    // Vamos converter para o formato que o Ecrã de Ficheiros gosta.
    const filesFormatted = messages.map(msg => ({
        _id: msg._id,
        title: msg.text.replace("📎 ", ""), // Remove o emoji para ficar limpo
        originalName: msg.text.replace("📎 ", ""),
        uploader: msg.sender, // Renomeamos 'sender' para 'uploader'
        createdAt: msg.createdAt,
        fileUrl: msg.fileUrl // Importante para o download
    }));

    res.json(filesFormatted);
  } catch (err) {
    console.error("ERRO AO LISTAR FICHEIROS:", err);
    res.status(500).json({ error: "Erro ao listar ficheiros." });
  }
});

// -------------------------
// GET /files/:fileId/download -> DOWNLOAD ATRAVÉS DA MENSAGEM
// -------------------------
router.get("/:fileId/download", verificarToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Procura na tabela de mensagens
    const msg = await Message.findById(fileId);
    if (!msg || !msg.fileUrl) {
        return res.status(404).json({ error: "Ficheiro não encontrado." });
    }

    // O fileUrl na BD é algo como "uploads/12345.pdf"
    // O res.download precisa do caminho absoluto no disco
    
    // Se o fileUrl tiver barras invertidas (Windows), normaliza
    const relativePath = msg.fileUrl.replace(/\\/g, "/").replace("uploads/", "");
    const filePath = path.join(uploadDir, relativePath);

    // Nome bonito para o download (sem o emoji)
    const downloadName = msg.text.replace("📎 ", "");

    if (fs.existsSync(filePath)) {
        return res.download(filePath, downloadName);
    } else {
        console.error("Ficheiro físico não encontrado:", filePath);
        return res.status(404).json({ error: "Ficheiro físico não encontrado no servidor." });
    }

  } catch (err) {
    console.error("ERRO NO DOWNLOAD:", err);
    res.status(500).json({ error: "Erro ao fazer download." });
  }
});

module.exports = router;