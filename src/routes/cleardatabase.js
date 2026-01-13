// script para limpar base de dados (apenas para desenvolvimento)

require("dotenv").config();
const mongoose = require("mongoose");

// ajusta o caminho conforme os teus models
const User = require("../models/User");
const Group = require("../models/Group");
const Meeting = require("../models/Meeting");
const Message = require("../models/Message");

async function main() {
  try {
    // usa EXACTAMENTE a mesma ligação que tens no database.js
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Ligado à base de dados. A apagar dados...");

    await Promise.all([
      User.deleteMany({}),
      Group.deleteMany({}),
      Meeting.deleteMany({}),
      Message.deleteMany({}),
    ]);

    console.log("✅ Users, Groups, Meetings e Messages apagados.");
    process.exit(0);
  } catch (err) {
    console.error("❌ ERRO AO LIMPAR BD:", err);
    process.exit(1);
  }
}

main();
