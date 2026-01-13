const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./src/database');
const jwt = require('jsonwebtoken');
const path = require('path'); 

const authRoutes = require('./src/routes/auth');
const groupRoutes = require('./src/routes/groups');
const messageRoutes = require('./src/routes/messages');
const filesRoutes = require('./src/routes/files');
const meetingRoutes = require('./src/routes/meetings'); // <--- 1. IMPORTAR ROTAS DE REUNIÕES

const http = require('http');
const { Server } = require('socket.io');

const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());

// PASTA UPLOADS PÚBLICA
const uploadsPath = path.join(process.cwd(), 'uploads');
console.log("📂 A servir ficheiros estáticos de:", uploadsPath);
app.use('/uploads', express.static(uploadsPath));

// DATABASE
connectDB();

// ROTAS API
app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);
app.use('/messages', messageRoutes);
app.use("/files", filesRoutes);
app.use("/meetings", meetingRoutes); // <--- 2. REGISTAR A ROTA DE REUNIÕES

// ROTA TESTE
app.get('/', (req, res) => {
  res.json({ message: 'API da Plataforma de Grupos de Estudo está online!' });
});

// CRIAR SERVIDOR HTTP
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
});

// MIDDLEWARE DE AUTENTICAÇÃO PARA SOCKET
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  
  if (!token) {
    return next(new Error("Token não fornecido"));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error("Token inválido"));
  }
});

// DISPONIBILIZAR io PARA AS ROTAS
app.set("io", io);

// SOCKET.IO CONFIG
io.on("connection", (socket) => {
  console.log("✅ Cliente conectado:", socket.id, "User:", socket.user?.id);
  
  if (!socket.user) {
    console.log("❌ Conexão rejeitada: usuário não autenticado");
    socket.disconnect();
    return;
  }
  
  socket.on("entrar_grupo", (groupId) => {
    if (!groupId) {
      console.log("❌ groupId não fornecido");
      return;
    }
    
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });
    
    socket.join(groupId);
    console.log(` Usuário ${socket.user.id} entrou na sala ${groupId}`);
    
    socket.emit("sala_entrada_confirmada", { 
      groupId, 
      message: "Entrou na sala com sucesso" 
    });
  });
  
  socket.on("disconnect", (reason) => {
    console.log(` Cliente desconectado: ${socket.id} - ${reason}`);
  });
  
  socket.on("enviar_mensagem", (data) => {
    console.log("Mensagem via socket:", data);
  });
});

// INICIAR SERVIDOR
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});