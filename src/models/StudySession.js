const sessionSchema = new mongoose.Schema({
  grupo: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  autor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  titulo: { type: String, required: true },
  dataHora: { type: Date, required: true },
  local: { type: String, required: true },
  criadoEm: { type: Date, default: Date.now }
});
