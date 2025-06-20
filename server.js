const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const waitingUsers = [];

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('ready', () => {
    console.log('User ready:', socket.id);

    // Clean up old/stale entries
    const index = waitingUsers.findIndex(s => s.id === socket.id);
    if (index !== -1) waitingUsers.splice(index, 1);

    if (waitingUsers.length > 0) {
      const partner = waitingUsers.shift(); // Remove waiting user
      const room = socket.id + '#' + partner.id;

      socket.join(room);
      partner.join(room);

      // Save room name for disconnection tracking
      socket.data.partnerId = partner.id;
      socket.data.room = room;
      partner.data.partnerId = socket.id;
      partner.data.room = room;

      socket.emit('match', { room, initiator: true });
      partner.emit('match', { room, initiator: false });

      console.log('Paired:', socket.id, '<->', partner.id, 'in room:', room);
    } else {
      waitingUsers.push(socket);
      console.log('User added to queue:', socket.id);
    }
  });

  socket.on('signal', ({ room, data }) => {
    socket.to(room).emit('signal', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    const index = waitingUsers.findIndex(u => u.id === socket.id);
    if (index !== -1) {
      waitingUsers.splice(index, 1);
      console.log('User removed from waiting queue:', socket.id);
    }

    const partnerId = socket.data?.partnerId;
    const room = socket.data?.room;
    if (partnerId && room) {
      const partnerSocket = [...io.sockets.sockets.values()].find(s => s.id === partnerId);
      if (partnerSocket) {
        partnerSocket.leave(room);
        partnerSocket.emit('partner-disconnected');
        // Optionally: let them re-enter the waiting queue
        waitingUsers.push(partnerSocket);
        console.log(`Requeued disconnected partner: ${partnerId}`);
      }
    }
  });
});

app.use(express.static('public'));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
