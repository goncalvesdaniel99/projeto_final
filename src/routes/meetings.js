const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Meeting = require('../models/Meeting');
const Group = require('../models/Group');

const JWT_SECRET = "segredo_super_secreto_do_projeto"; 

// ============================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================
const auth = (req, res, next) => {
  const tokenHeader = req.header('auth-token') || req.header('Authorization');
  if (!tokenHeader) return res.status(401).json({ error: 'Acesso negado.' });

  try {
    const token = tokenHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Token inválido' });
  }
};

// ============================
// 1. CRIAR REUNIÃO
// ============================
router.post('/create', auth, async (req, res) => {
  try {
    const { groupId, startsAt, location, notes } = req.body;
    const userId = req.user.id;

    // 1. Validações básicas
    if (!groupId || !startsAt || !location) {
        return res.status(400).json({ error: "Preenche o grupo, a data e a localização/link." });
    }

    // 2. Verificar se o grupo existe
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Grupo não encontrado" });
    
    // 3. Verificar se o utilizador é membro do grupo
    const isMember = group.membros.some(m => String(m) === String(userId));
    if (!isMember) return res.status(403).json({ error: "Não tens permissão para criar reuniões neste grupo." });

    // 4. Criar a reunião
    const newMeeting = new Meeting({
      group: groupId,
      createdBy: userId,
      startsAt: new Date(startsAt), // Garante que é guardado como Data
      location: location, // Pode ser uma sala ou um Link (Zoom/Teams)
      notes: notes
    });

    const saved = await newMeeting.save();
    
    // Devolve dados populados (úteis para o frontend atualizar logo)
    await saved.populate('createdBy', 'nome email');
    
    console.log("✅ Reunião criada:", saved._id);
    res.json(saved);

  } catch (err) {
    console.error("Erro ao criar reunião:", err);
    res.status(500).json({ error: "Erro ao criar reunião." });
  }
});

// ============================
// 2. LISTAR REUNIÕES DE UM GRUPO (Para o Chat)
// ============================
router.get('/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    // 1. Verificar se o utilizador pertence ao grupo (Segurança)
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Grupo não encontrado" });

    const isMember = group.membros.some(m => String(m) === String(req.user.id));
    if (!isMember) return res.status(403).json({ error: "Não és membro deste grupo." });

    // 2. Buscar reuniões futuras e ordenar pela data mais próxima
    const meetings = await Meeting.find({ 
        group: groupId,
        startsAt: { $gte: new Date() } // Apenas reuniões futuras
    })
    .populate('createdBy', 'nome')
    .sort({ startsAt: 1 }); // 1 = Ascendente (Data mais próxima primeiro)

    res.json(meetings);

  } catch (err) {
    console.error("Erro ao buscar reuniões do grupo:", err);
    res.status(500).json({ error: "Erro ao buscar reuniões." });
  }
});

// ============================
// 3. LISTAR TODAS AS MINHAS REUNIÕES (Para Calendário/Dashboard)
// ============================
router.get('/my/all', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Descobrir ID de todos os grupos onde estou
    const myGroups = await Group.find({ membros: userId }).select('_id');
    const groupIds = myGroups.map(g => g._id);

    // 2. Buscar reuniões desses grupos
    const meetings = await Meeting.find({ 
        group: { $in: groupIds },
        startsAt: { $gte: new Date() } // Apenas futuras
    })
    .populate('group', 'disciplina curso') 
    .populate('createdBy', 'nome') 
    .sort({ startsAt: 1 });

    res.json(meetings);
  } catch (err) {
    console.error("Erro meetings globais:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;