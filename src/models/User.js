const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  
  // password
  password: { type: String, required: true },

  // campos
  primeiroNome: String,
  ultimoNome: String,
  escola: String,  // ESE / ESS / ESTG / ESA / ESCE / ESDL
  ano: Number,     // 1,2,3...
  curso: String,   // Agronomia / Engenharia Informática / Enfermagem
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);