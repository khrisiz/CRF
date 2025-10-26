const socket = io(); // Connects to your server (Render URL if deployed)

let localStream;
let peerConnection;
const roomId = 'chess-game-123'; // same for both peers

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

// 1️⃣ Get user media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    document.getElementById('localVideo').srcObject = stream;
  })
  .catch(err => console.error('Error accessing camera/mic:', err));

// 2️⃣ Join signaling room
socket.emit('join-room', roomId);
console.log('Joined room:', roomId);

// 3️⃣ Helper to create a new RTCPeerConnection with event handlers
function createPeerConnection() {
  const pc = new RTCPeerConnection(configuration);

  // Send ICE candidates to remote peer
  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('ice-candidate', event.candidate, roomId);
    }
  };

  // Receive remote tracks
  pc.ontrack = event => {
    document.getElementById('remoteVideo').srcObject = event.streams[0];
  };

  pc.onconnectionstatechange = () => {
    console.log('Connection state:', pc.connectionState);
  };

  return pc;
}

// 4️⃣ Handle incoming offer
socket.on('offer', async (offer, senderId) => {
  console.log(`Received offer from ${senderId}`);
  peerConnection = createPeerConnection();

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  // Add local stream
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Create answer
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer, roomId);
});

// 5️⃣ Handle incoming answer
socket.on('answer', async (answer, senderId) => {
  console.log(`Received answer from ${senderId}`);
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// 6️⃣ Handle incoming ICE candidates
socket.on('ice-candidate', async (candidate, senderId) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error('Error adding ICE candidate:', err);
  }
});

// 7️⃣ Start call (Player 1)
async function createOffer() {
  peerConnection = createPeerConnection();

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit('offer', offer, roomId);
  console.log('Offer sent to room:', roomId);
}

// 8️⃣ Button to initiate the call
document.getElementById('startCall').addEventListener('click', createOffer);


