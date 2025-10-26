const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Create an Express application
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server);

// Serve static files (if needed, for frontend UI)
app.use(express.static('public'));

// When a new client connects
io.on('connection', socket => {
  console.log('New client connected: ', socket.id);

  // When the client sends an 'offer' message
  socket.on('offer', (offer, roomId) => {
    console.log(`Offer received from ${socket.id} for room ${roomId}`);
    // Broadcast the offer to other clients in the room
    socket.to(roomId).emit('offer', offer, socket.id);
  });

  // When the client sends an 'answer' message
  socket.on('answer', (answer, roomId) => {
    console.log(`Answer received from ${socket.id} for room ${roomId}`);
    // Broadcast the answer to the client that made the offer
    socket.to(roomId).emit('answer', answer, socket.id);
  });

  // When the client sends an ICE candidate
  socket.on('ice-candidate', (candidate, roomId) => {
    console.log(`ICE candidate received from ${socket.id} for room ${roomId}`);
    // Broadcast the ICE candidate to the other client
    socket.to(roomId).emit('ice-candidate', candidate, socket.id);
  });

  // Join a room (for peer-to-peer connections)
  socket.on('join-room', (roomId) => {
    console.log(`${socket.id} joining room ${roomId}`);
    socket.join(roomId);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected: ', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

