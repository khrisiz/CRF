const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let peerConnection;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Get local video/audio
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;
    localStream = stream;
    startCall();
  })
  .catch(console.error);

// Create PeerConnection
function createPeer() {
  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = e => remoteVideo.srcObject = e.streams[0];
  peerConnection.onicecandidate = e => {
    if (e.candidate) socket.emit('ice-candidate', e.candidate);
  };
}

// Start a call
function startCall() {
  createPeer();
  peerConnection.createOffer()
    .then(offer => peerConnection.setLocalDescription(offer))
    .then(() => socket.emit('offer', peerConnection.localDescription));
}

// Handle incoming signals
socket.on('offer', async offer => {
  createPeer();
  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer);
});

socket.on('answer', async answer => {
  await peerConnection.setRemoteDescription(answer);
});

socket.on('ice-candidate', candidate => {
  peerConnection.addIceCandidate(candidate);
});
