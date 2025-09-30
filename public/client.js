const socket = io();
const peer = new RTCPeerConnection();
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// 1. Get webcam + mic
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
  })
  .catch(err => console.error("Error accessing media devices:", err));

// 2. When remote stream arrives, show it
peer.ontrack = event => {
  remoteVideo.srcObject = event.streams[0];
};

// 3. Send ICE candidates to server
peer.onicecandidate = event => {
  if (event.candidate) {
    socket.emit("ice-candidate", event.candidate);
  }
};

// 4. Handle signaling messages from server
socket.on("offer", async (offer) => {
  await peer.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  socket.emit("answer", answer);
});

socket.on("answer", async (answer) => {
  await peer.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", async (candidate) => {
  try {
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error("Error adding ICE candidate:", err);
  }
});

// 5. When first user joins, create an offer
async function makeOffer() {
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  socket.emit("offer", offer);
}

// Try making an offer a few seconds after connecting
socket.on("connect", () => {
  setTimeout(makeOffer, 1000);
});
