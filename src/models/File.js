// backend/src/models/File.js
const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: { type: String, required: true },

  originalName: { type: String, required: true }, // nome original enviado
  fileName: { type: String, required: true },     // nome guardado em disco
  mimeType: String,
  size: Number,

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("File", fileSchema);
