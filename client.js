const socket = io();
let localStream;
let peerConnection;
let currentRoom = null;

const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const skipBtn = document.getElementById('skipBtn');
const statusText = document.getElementById('status');
const queueText = document.getElementById('queue');
const nsfwScoreText = document.getElementById('nsfwScore');
const tipBtn = document.getElementById('tipBtn');
const tipAmount = document.getElementById('tipAmount');

// 🔴 NSFW SNAPSHOT FUNCTION
function sendSnapshot() {
  if (!localVideo || localVideo.readyState !== 4) return;

  const canvas = document.createElement('canvas');
  canvas.width = localVideo.videoWidth;
  canvas.height = localVideo.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(localVideo, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

  console.log('📸 Sending snapshot to server');
  socket.emit('image', dataUrl);
}

// 🔄 Get webcam and mic
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
    socket.emit('ready');
  })
  .catch(err => alert('Camera/mic error: ' + err));

socket.on('connect', () => {
  console.log('Connected as:', socket.id);
});

socket.on('match', ({ room, initiator }) => {
  currentRoom = room;
  statusText.innerText = 'CONNECTED — STAY LIVE.';
  skipBtn.disabled = false;
  tipBtn.disabled = false;
  startPeerConnection(initiator);

  // Start NSFW scanning every 10s
  clearInterval(window.snapshotInterval);
  window.snapshotInterval = setInterval(sendSnapshot, 10000);
});

socket.on('signal', async data => {
  if (!peerConnection) return;
  try {
    if (data.type === 'offer') {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('signal', { room: currentRoom, data: peerConnection.localDescription });
    } else if (data.type === 'answer') {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
    } else if (data.candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  } catch (e) {
    console.error('Signal error:', e);
  }
});

socket.on('queueStatus', ({ queueLength }) => {
  queueText.innerText = `Queue: ${queueLength}`;
});

socket.on('skip', () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
  skipBtn.disabled = true;
  tipBtn.disabled = true;
  statusText.innerText = 'WAITING FOR SOMEONE TO TAP IN...';
  clearInterval(window.snapshotInterval);
});

socket.on('disconnect', () => {
  tipBtn.disabled = true;
  clearInterval(window.snapshotInterval);
});

// New: Handle NSFW detection scores from the server
socket.on('detectionScores', (data) => {
  const porn = data.predictions.find(p => p.className === 'Porn');
  const hentai = data.predictions.find(p => p.className === 'Hentai');
  
  // Find the highest score between Porn and Hentai
  const score = Math.max(porn.probability, hentai.probability);
  nsfwScoreText.innerText = `NSFW Score: ${score.toFixed(2)}`;

  console.log('Full NSFW Predictions:', data.predictions);
});

// 🔥 Handle NSFW detection from server
socket.on('nsfwDetected', () => {
  alert('⚠️ NSFW content detected! Disconnecting...');
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
  skipBtn.disabled = true;
  tipBtn.disabled = true;
  statusText.innerText = 'DISCONNECTED DUE TO NSFW VIOLATION';
  socket.emit('skip', { room: currentRoom });
  clearInterval(window.snapshotInterval);
  currentRoom = null;
});

