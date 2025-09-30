const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (index.html, client.js, etc.)
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Relay "offer" to other peer
  socket.on("offer", (offer) => {
    socket.broadcast.emit("offer", offer);
  });

  // Relay "answer" to other peer
  socket.on("answer", (answer) => {
    socket.broadcast.emit("answer", answer);
  });

  // Relay ICE candidates
  socket.on("ice-candidate", (candidate) => {
    socket.broadcast.emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

