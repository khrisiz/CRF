const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

let queue = []; // list of sockets waiting to be matched
const rooms = new Map(); // socket.id -> room name

function makeRoomName(id1, id2) {
  return `room-${id1}-${id2}`;
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

    console.log(`Matched ${user1.id} with ${user2.id} in room ${room}`);
  }

  broadcastQueueStatus();
}

function removeRoomEntries(room) {
  for (const [id, r] of rooms.entries()) {
    if (r === room) {
      rooms.delete(id);
    }
  }
}

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('ready', () => {
    if (!queue.find(s => s.id === socket.id)) {
      queue.push(socket);
      tryToMatch();
    }
  });

  socket.on('signal', ({ room, data }) => {
    if (room) {
      socket.to(room).emit('signal', data);
    }
  });

  socket.on('skip', ({ room }) => {
    console.log('User skipped:', socket.id);

    // Leave current room and notify peer
    socket.leave(room);
    socket.to(room).emit('skip');

    // Remove both users from rooms map
    removeRoomEntries(room);

    // Ensure user isn't duplicated in queue
    queue = queue.filter(s => s.id !== socket.id);
    if (!queue.find(s => s.id === socket.id)) {
      queue.push(socket);
    }

    tryToMatch();
  });

  socket.on('tip', ({ room, amount }) => {
    if (room && typeof amount === 'number' && amount > 0) {
      socket.to(room).emit('tip', { from: socket.id, amount });
      console.log(`User ${socket.id} sent a tip of ${amount} in room ${room}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Remove from queue
    queue = queue.filter(s => s.id !== socket.id);
    broadcastQueueStatus();

    // Notify peer and remove from room map
    const room = rooms.get(socket.id);
    if (room) {
      socket.to(room).emit('skip');
      removeRoomEntries(room);
    }
  });
});

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
