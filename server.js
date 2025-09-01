const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let queue = [];
const rooms = new Map();

function makeRoomName(id1, id2) {
  return [id1, id2].sort().join('-');
}

function broadcastQueueStatus() {
  io.emit('queueStatus', {
    queueLength: queue.length,
    users: queue.map(sock => sock.id)
  });
}

function tryToMatch() {
  while (queue.length >= 2) {
    const user1 = queue.shift();
    const user2 = queue.shift();

    const room = makeRoomName(user1.id, user2.id);

    rooms.set(user1.id, room);
    rooms.set(user2.id, room);

    user1.join(room);
    user2.join(room);

    user1.emit('match', { room, initiator: true });
    user2.emit('match', { room, initiator: false });

    console.log(`🔗 Matched ${user1.id} with ${user2.id} in room ${room}`);
  }

  broadcastQueueStatus();
}

// Socket.io connection
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('ready', () => {
    if (!queue.find(s => s.id === socket.id)) {
      queue.push(socket);
      tryToMatch();
    }
  });

  socket.on('signal', ({ room, data }) => {
    socket.to(room).emit('signal', data);
  });

  socket.on('skip', ({ room }) => {
    console.log('⏭️ User skipped:', socket.id);

    socket.leave(room);
    socket.to(room).emit('skip');
    rooms.delete(socket.id);

    queue = queue.filter(s => s.id !== socket.id);
    queue.push(socket);
    tryToMatch();
  });

  socket.on('tip', ({ room, amount }) => {
    socket.to(room).emit('tip', { from: socket.id, amount });
    console.log(`💸 Tip from ${socket.id}: $${amount} in room ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);

    queue = queue.filter(s => s.id !== socket.id);
    broadcastQueueStatus();

    const room = rooms.get(socket.id);
    if (room) {
      socket.to(room).emit('skip');
      rooms.delete(socket.id);
    }
  });
});

// Static files (optional)
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port: http://localhost:${port}`);
});

