const socket = io('https://www.wokisha.online');

let localStream;
let peerConnection;
let currentTurn = 'white';  // white starts
let selectedPiece = null;
let selectedSquare = null;
const roomId = 'chess-game-123'; // same for both peers

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

// Initialize Three.js scene
let scene, camera, renderer;
let chessboard, pieces = [];
let selectedPiece3D = null;

function createScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-board') });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Lighting
  const light = new THREE.PointLight(0xFFFFFF);
  light.position.set(10, 10, 10);
  scene.add(light);

  // Create 3D Chessboard
  createChessboard();
  camera.position.z = 10;
  animate();
}

// Create chessboard (8x8 grid)
function createChessboard() {
  const boardGeometry = new THREE.BoxGeometry(1, 1, 0.1);
  const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x3b3b3b });
  const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xd4d4d4 });

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = new THREE.Mesh(
        boardGeometry,
        (row + col) % 2 === 0 ? lightMaterial : darkMaterial
      );
      square.position.set(col - 3.5, row - 3.5, 0);
      scene.add(square);
    }
  }
}

// Create 3D piece (using cylinders for simplicity)
function createPiece(piece, row, col, color) {
  const geometry = new THREE.CylinderGeometry(0.4, 0.4, 1);
  const material = new THREE.MeshBasicMaterial({ color: color === 'white' ? 0xFFFFFF : 0x000000 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(col - 3.5, row - 3.5, 0.5);
  scene.add(mesh);
  pieces.push({ piece, row, col, mesh });
}

// Initialize board pieces based on the initial setup
function initializePieces() {
  const initialBoard = [
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
  ];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = initialBoard[row][col];
      if (piece) {
        const color = piece === piece.toUpperCase() ? 'white' : 'black';
        createPiece(piece, row, col, color);
      }
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Handle video call setup
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    document.getElementById('localVideo').srcObject = stream;
  })
  .catch(err => console.error('Error accessing camera/mic:', err));

// Join signaling room
socket.emit('join-room', roomId);

// WebRTC setup
function createPeerConnection() {
  const pc = new RTCPeerConnection(configuration);

  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('ice-candidate', event.candidate, roomId);
    }
  };

  pc.ontrack = event => {
    document.getElementById('remoteVideo').srcObject = event.streams[0];
  };

  return pc;
}

// Start call (Player 1)
async function createOffer() {
  peerConnection = createPeerConnection();

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit('offer', offer, roomId);
  console.log('Offer sent to room:', roomId);
}

// Handle signaling events
socket.on('offer', async (offer, senderId) => {
  peerConnection = createPeerConnection();
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer, roomId);
});

socket.on('answer', async (answer, senderId) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async (candidate, senderId) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error('Error adding ICE candidate:', err);
  }
});

socket.on('move', (move, senderId) => {
  applyMoveToBoard(move);
  switchTurn();
});

// Send move data to the other player
function sendMove(move) {
  socket.emit('move', move, roomId);
}

// Apply move to the board
function applyMoveToBoard(move) {
  const fromSquare = pieces.find(p => p.row === move.fromRow && p.col === move.fromCol);
  const toSquare = pieces.find(p => p.row === move.toRow && p.col === move.toCol);

  if (fromSquare && toSquare) {
    toSquare.mesh.position.set(toSquare.col - 3.5, toSquare.row - 3.5, 0.5);
    fromSquare.mesh.position.set(fromSquare.col - 3.5, fromSquare.row - 3.5, 0.5);
  }
}

// Switch turns after each move
function switchTurn() {
  currentTurn = currentTurn === 'white' ? 'black' : 'white';
  document.getElementById('turnIndicator').textContent = `It's ${currentTurn}'s turn`;
}

createScene();  // Initialize Three.js scene
initializePieces();  // Initialize chess pieces
document.getElementById('startCall').addEventListener('click', createOffer);

