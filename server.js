const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const nsfw = require('nsfwjs');
const tf = require('@tensorflow/tfjs-node');
const jpeg = require('jpeg-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let nsfwModel;
let queue = [];
const rooms = new Map();

// Load NSFW model on server start
(async () => {
  try {
    nsfwModel = await nsfw.load();
    console.log('✅ NSFW model loaded');
  } catch (err) {
    console.error('❌ Failed to load NSFW model:', err);
  }
})();

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

  // ✅ NSFW image handler
  socket.on('image', async (dataUrl) => {
    try {
      const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');

      const imageTensor = tf.node.decodeImage(buffer, 3);
      const predictions = await nsfwModel.classify(imageTensor);
      imageTensor.dispose();

      const room = rooms.get(socket.id);
      if (!room) return;

      io.to(room).emit('detectionScores', { predictions });

      const porn = predictions.find(p => p.className === 'Porn') || { probability: 0 };
      const hentai = predictions.find(p => p.className === 'Hentai') || { probability: 0 };
      const score = Math.max(porn.probability, hentai.probability);

      console.log(`🧠 NSFW score from ${socket.id} in ${room}:`, score);

      if (score > 0.1) {
        console.log(`🚨 NSFW content detected from ${socket.id}`);
        io.to(room).emit('nsfwDetected');
      }
    } catch (err) {
      console.error('❌ NSFW detection error:', err);
    }
  });
});

// Static files (optional)
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

