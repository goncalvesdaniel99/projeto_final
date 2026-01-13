const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  curso: { type: String, required: true },
  ano: { type: Number, required: true },
  disciplina: { type: String, required: true },
  maxPessoas: { type: Number, required: true },
  membros: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  criador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  criadoEm: { type: Date, default: Date.now }
});

let Group;

try {
  Group = mongoose.model('Group');
} catch (error) {
  Group = mongoose.model('Group', GroupSchema);
}

module.exports = Group;