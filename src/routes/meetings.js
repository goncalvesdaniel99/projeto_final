const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const Group = require('../models/Group');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "segredo_super_secreto_do_projeto";

// Middleware de Autenticação
function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send({ error: "Token não fornecido" });

    try {
        const token = authHeader.replace("Bearer ", "");
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).send({ error: "Token inválido" });
    }
}

// GET /meetings/my - Lista as reuniões do utilizador
router.get('/my', verificarToken, async (req, res) => {
    try {
        // 1. Encontrar todos os grupos onde o utilizador é membro
        const userGroups = await Group.find({ membros: req.user.id }, '_id');
        
        // Extrai apenas os IDs dos grupos num array
        const groupIds = userGroups.map(g => g._id);

        if (groupIds.length === 0) {
            return res.json([]); // Se não tem grupos, não tem reuniões
        }

        // 2. Encontrar reuniões associadas a esses grupos
        const meetings = await Meeting.find({ group: { $in: groupIds } })
            .populate('group', 'disciplina curso ano') // Traz info do grupo
            .populate('createdBy', 'nome email')       // Traz info de quem criou
            .sort({ startsAt: 1 });                    // Ordena por data (mais próxima primeiro)

        res.json(meetings);

    } catch (err) {
        console.error("❌ Erro no GET /meetings/my:", err);
        res.status(500).json({ error: "Erro ao buscar reuniões." });
    }
});

// POST /meetings/create - Criar uma nova reunião
router.post('/create', verificarToken, async (req, res) => {
    try {
        const { groupId, date, time, location, notes } = req.body;

        if (!groupId || !date || !time) {
            return res.status(400).json({ error: "Dados em falta (groupId, date, time)" });
        }

        // Combina data e hora numa string ISO válida
        // Ex: date="2026-01-15", time="14:30" -> "2026-01-15T14:30:00.000Z"
        const finalDateTime = new Date(`${date}T${time}:00`);

        const newMeeting = new Meeting({
            group: groupId,
            createdBy: req.user.id,
            startsAt: finalDateTime,
            location: location || "Online",
            notes: notes || ""
        });

        await newMeeting.save();
        
        // Retorna a reunião populada para o frontend atualizar logo a lista
        const populatedMeeting = await Meeting.findById(newMeeting._id)
            .populate('group', 'disciplina')
            .populate('createdBy', 'nome');

        res.status(201).json(populatedMeeting);

    } catch (err) {
        console.error("❌ Erro ao criar reunião:", err);
        res.status(500).json({ error: "Erro ao criar reunião" });
    }
});

module.exports = router;