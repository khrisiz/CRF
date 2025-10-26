const socket = io();

// Create a new RTCPeerConnection
let localStream;
let peerConnection;
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

// Get user media (video/audio)
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    document.getElementById('localVideo').srcObject = stream;
  })
  .catch(error => {
    console.error('Error getting media: ', error);
  });

// Join a room (replace 'roomId' with actual room or game ID)
const roomId = 'chess-game-123';
socket.emit('join-room', roomId);

// When receiving an offer from another peer
socket.on('offer', (offer, senderId) => {
  console.log(`Received offer from ${senderId}`);
  peerConnection = new RTCPeerConnection(configuration);
  peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  
  // Add local stream tracks to peer connection
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Create and send an answer
  peerConnection.createAnswer()
    .then(answer => {
      return peerConnection.setLocalDescription(answer);
    })
    .then(() => {
      socket.emit('answer', peerConnection.localDescription, roomId);
    })
    .catch(error => console.error('Error creating answer: ', error));
});

// When receiving an answer from the remote peer
socket.on('answer', (answer, senderId) => {
  console.log(`Received answer from ${senderId}`);
  peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// When receiving an ICE candidate
socket.on('ice-candidate', (candidate, senderId) => {
  console.log(`Received ICE candidate from ${senderId}`);
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

// When the peer connection gathers ICE candidates
peerConnection.onicecandidate = event => {
  if (event.candidate) {
    socket.emit('ice-candidate', event.candidate, roomId);
  }
};

// Display remote video stream
peerConnection.ontrack = event => {
  document.getElementById('remoteVideo').srcObject = event.streams[0];
};

// Send offer to other peer when ready (for the first user)
function createOffer() {
  peerConnection = new RTCPeerConnection(configuration);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.createOffer()
    .then(offer => {
      return peerConnection.setLocalDescription(offer);
    })
    .then(() => {
      socket.emit('offer', peerConnection.localDescription, roomId);
    })
    .catch(error => console.error('Error creating offer: ', error));
}

// Call createOffer() when you want to initiate the connection
// createOffer(); // For initiating the call (for Player 1)

