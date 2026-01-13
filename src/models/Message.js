const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: false // Pode ser opcional se for apenas um ficheiro
  },
  // --- NOVOS CAMPOS OBRIGATÓRIOS ---
  fileUrl: {
    type: String, // Guarda o caminho do ficheiro (uploads/...)
    default: null
  },
  type: {
    type: String, // 'text' ou 'file'
    default: 'text'
  },
  // ---------------------------------
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', MessageSchema);