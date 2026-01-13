const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Meeting = require('../models/Meeting');
const Group = require('../models/Group');

const JWT_SECRET = "segredo_super_secreto_do_projeto"; 

// Middleware Auth
const auth = (req, res, next) => {
  const token = req.header('auth-token') || req.header('Authorization');
  if (!token) return res.status(401).send('Acesso negado.');
  try {
    const cleanToken = token.replace('Bearer ', '');
    req.user = jwt.verify(cleanToken, JWT_SECRET);
    next();
  } catch (err) {
    res.status(400).send('Token inválido');
  }
};

// --- 1. LISTAR REUNIÕES (GET) ---
router.get('/my', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Descobrir grupos onde sou membro
    const myGroups = await Group.find({ membros: userId }).select('_id');
    const groupIds = myGroups.map(g => g._id);

    // Buscar reuniões (usando startsAt e createdBy)
    const meetings = await Meeting.find({ 
        group: { $in: groupIds },
        startsAt: { $gte: new Date() } // Apenas futuras
    })
    .populate('group', 'disciplina curso') 
    .populate('createdBy', 'nome email') // <--- CORREÇÃO: createdBy
    .sort({ startsAt: 1 }); // <--- CORREÇÃO: startsAt

    res.json(meetings);
  } catch (err) {
    console.error("Erro meetings:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- 2. CRIAR REUNIÃO (POST) ---
router.post('/', auth, async (req, res) => {
  try {
    // Recebemos os dados do frontend
    const { groupId, startsAt, location, notes } = req.body;
    const userId = req.user.id;

    // Validações básicas
    if (!groupId || !startsAt || !location) {
        return res.status(400).json({ error: "Preenche grupo, data e localização." });
    }

    // Validar se pertence ao grupo
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Grupo não encontrado" });
    
    // Verificar membro (converte para string para comparar IDs)
    const isMember = group.membros.some(m => String(m) === String(userId));
    if (!isMember) return res.status(403).json({ error: "Não pertences a este grupo" });

    // CRIAR A REUNIÃO (Com os campos do teu Modelo)
    const newMeeting = new Meeting({
      group: groupId,
      createdBy: userId,            // <--- CORREÇÃO: Usa o teu campo createdBy
      startsAt: new Date(startsAt), // <--- CORREÇÃO: Usa o teu campo startsAt
      location: location,
      notes: notes
    });

    const saved = await newMeeting.save();
    
    // Devolvemos logo os dados populados para facilitar
    await saved.populate('group', 'disciplina');
    await saved.populate('createdBy', 'nome');

    console.log("✅ Reunião criada:", saved._id);
    res.json(saved);

  } catch (err) {
    console.error("Erro ao criar reunião:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;