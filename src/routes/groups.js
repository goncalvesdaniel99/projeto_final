const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User'); // Importamos o User para o debug
const jwt = require('jsonwebtoken');

// Tenta importar o modelo de reuniões (opcional por agora)
let Meeting;
try {
  Meeting = require('../models/Meeting');
} catch (e) {
  console.log("⚠️ AVISO: Ficheiro 'models/Meeting.js' ainda não existe.");
}

const JWT_SECRET = "segredo_super_secreto_do_projeto";

// Dicionário de disciplinas (Mantive a tua lógica original)
const cursos = {
  "Engenharia Informática": {
    1: ["AED", "Matemática Discreta", "Álgebra Linear", "ASC", "Analise", "Prog1", "Estatistica", "SO"],
    2: ["Bases de Dados", "Projeto1", "Redes de Computadores", "Engenharia de Software", "Prog2", "Projeto2", "IHM", "Multimedia", "Inteligencia Artificial"],
    3: ["Gestao de Projetos", "IS", "SIR", "Projeto3", "IE", "Projeto4"],
  },
};

// =========================
// MIDDLEWARE TOKEN
// =========================
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['auth-token'];
  if (!authHeader) return res.status(401).json({ error: "Token não fornecido" });

  const token = authHeader.replace("Bearer ", "");
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Fica aqui o id e email
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// Helper
function isMember(grupo, userId) {
  return grupo.membros.some((m) => String(m) === String(userId));
}

// =========================
// 1. CRIAR GRUPO
// =========================
router.post('/create', verificarToken, async (req, res) => {
  try {
    const { curso, ano, disciplina, maxPessoas } = req.body;

    if (!curso || !ano || !disciplina || !maxPessoas) {
      return res.status(400).json({ error: "Campos incompletos." });
    }

    // Validação de cursos (Mantive a tua lógica)
    if (cursos[curso]) {
      if (!cursos[curso][ano]) return res.status(400).json({ error: "Ano inválido." });
      if (!cursos[curso][ano].includes(disciplina)) return res.status(400).json({ error: "Disciplina inválida." });
    }

    const grupo = new Group({
      curso,
      ano,
      disciplina,
      maxPessoas,
      membros: [req.user.id], // Adiciona o criador como membro
      criador: req.user.id,
    });

    await grupo.save();
    res.json({ message: "Grupo criado com sucesso!", grupo });

  } catch (err) {
    console.error("ERRO CRIAR:", err);
    res.status(500).json({ error: "Erro ao criar grupo." });
  }
});

// =========================
// 2. MEUS GRUPOS (CORRIGIDO)
// =========================
router.get('/my', verificarToken, async (req, res) => {
  try {
    // 👇 AQUI ESTAVA O PROBLEMA: Lemos das duas maneiras para garantir
    const userId = req.user.id || req.user._id;
    
    console.log(`🔎 ID a pesquisar: ${userId}`);

    // Procura grupos onde o array 'membros' contém este ID
    const grupos = await Group.find({ membros: userId })
      .populate('criador', 'nome email')
      .populate('membros', 'nome email');

    console.log(`📦 Encontrados: ${grupos.length} grupos.`);
    res.json(grupos);

  } catch (err) {
    console.error("ERRO MEUS GRUPOS:", err);
    res.status(500).json({ error: "Erro ao obter os grupos." });
  }
});

// =========================
// 3. LISTAR TODOS
// =========================
router.get('/all', async (req, res) => {
  try {
    const grupos = await Group.find()
      .populate('criador', 'nome email')
      .populate('membros', 'nome email');

    const gruposComOcupacao = grupos.map((g) => {
      const obj = g.toObject();
      return {
        ...obj,
        ocupacao: `${obj.membros.length}/${obj.maxPessoas}`,
      };
    });

    res.json(gruposComOcupacao);
  } catch (err) {
    res.status(500).json({ error: "Erro ao obter grupos." });
  }
});

// =========================
// 4. INFO GRUPO
// =========================
router.get("/info/:id", verificarToken, async (req, res) => {
  try {
    const grupo = await Group.findById(req.params.id)
      .populate("criador", "nome email")
      .populate("membros", "nome email");

    if (!grupo) return res.status(404).json({ error: "Grupo não encontrado." });
    res.json(grupo);
  } catch (err) {
    res.status(500).json({ error: "Erro ao obter info." });
  }
});

// =========================
// 5. ENTRAR (JOIN)
// =========================
router.post('/join/:id', verificarToken, async (req, res) => {
  try {
    const grupo = await Group.findById(req.params.id);
    if (!grupo) return res.status(404).json({ error: "Grupo não encontrado." });

    if (isMember(grupo, req.user.id)) return res.status(400).json({ error: "Já és membro." });
    if (grupo.membros.length >= grupo.maxPessoas) return res.status(400).json({ error: "Cheio." });

    grupo.membros.push(req.user.id);
    await grupo.save();

    res.json({ message: "Entraste no grupo!", grupo });
  } catch (err) {
    res.status(500).json({ error: "Erro ao entrar." });
  }
});

// =========================
// 6. SAIR (LEAVE)
// =========================
router.post('/leave/:id', verificarToken, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;
    const grupo = await Group.findById(groupId);

    if (!grupo) return res.status(404).json({ error: "Grupo não encontrado." });

    const isCreator = String(grupo.criador) === String(userId);
    if (!isMember(grupo, userId)) return res.status(400).json({ error: "Não estás no grupo." });

    // Se for o criador e for o último, apaga
    if (isCreator && grupo.membros.length === 1) {
      if(Meeting) await Meeting.deleteMany({ group: groupId });
      await Group.findByIdAndDelete(groupId);
      return res.json({ deleted: true, message: "Grupo eliminado." });
    }
    
    // Se for criador e houver mais gente
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

// ==========================================
// 🕵️ 7. ROTA DE DIAGNÓSTICO (NOVA)
// ==========================================
router.get('/debug/check-db', async (req, res) => {
  try {
    const allGroups = await Group.find();
    const allUsers = await User.find();

    res.json({
      TOTAL_USERS: allUsers.length,
      TOTAL_GROUPS: allGroups.length,
      
      // Lista de Utilizadores (para veres o teu ID)
      USERS_LIST: allUsers.map(u => ({
        ID: u._id,
        Nome: u.nome,
        Email: u.email
      })),

      // Lista de Grupos (para veres quem está nos membros)
      GROUPS_LIST: allGroups.map(g => ({
        ID_Grupo: g._id,
        Disciplina: g.disciplina,
        Membros_IDs: g.membros, // <--- CONFIRMA SE O TEU ID ESTÁ AQUI
        Criador_ID: g.criador
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;