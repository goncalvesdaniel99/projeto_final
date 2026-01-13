const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("🔌 A tentar ligar ao MongoDB Atlas...");

    // O teu link direto (sem verificações chatas)
    const dbURI = "mongodb+srv://goncalvesdaniel:1234@goncalvesdaniel.axf6knm.mongodb.net/?appName=goncalvesdaniel";

    await mongoose.connect(dbURI);

    console.log("✅ MongoDB Conectado com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao ligar ao MongoDB:", err.message);
  }
};

module.exports = connectDB;