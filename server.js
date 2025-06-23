const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); 
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname)); // serve index.html and socket.io client
app.use(bodyParser.json()); // Add this if not using express.json()

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

io.on('connection', socket => {
  console.log('User connected:', socket.id);

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
    console.log('User skipped:', socket.id);

    // Leave current room and notify peer
    socket.leave(room);
    socket.to(room).emit('skip');
    rooms.delete(socket.id);

    // Remove from queue if already there
    queue = queue.filter(s => s.id !== socket.id);

    // Re-add to queue
    queue.push(socket);
    tryToMatch();
  });

  socket.on('tip', ({ room, amount }) => {
    // Broadcast the tip to the other user in the room
    socket.to(room).emit('tip', { from: socket.id, amount });
    console.log(`User ${socket.id} sent a tip of ${amount} in room ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Remove from queue
    queue = queue.filter(s => s.id !== socket.id);
    broadcastQueueStatus();

    // If they were in a room, notify the other peer
    const room = rooms.get(socket.id);
    if (room) {
      socket.to(room).emit('skip');
      rooms.delete(socket.id);
    }
  });
});

// Serve index.html for the front-end
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static('public')); // serve static files

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
