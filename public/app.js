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

// Initialize chess board
const board = [
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
];

// Create the chess board
function createBoard() {
  const boardElement = document.getElementById('game-board');
  boardElement.innerHTML = ''; // Clear any existing board
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.classList.add('square');
      square.classList.add((row + col) % 2 === 0 ? 'white' : 'black');
      square.dataset.row = row;
      square.dataset.col = col;
      square.textContent = board[row][col];
      square.addEventListener('click', () => handlePieceSelection(board[row][col], square));
      boardElement.appendChild(square);
    }
  }
}

// Handle piece selection
function handlePieceSelection(piece, square) {
  const fromRow = parseInt(square.dataset.row);
  const fromCol = parseInt(square.dataset.col);

  if (!selectedPiece) {
    // Select the piece if it's your turn
    if (currentTurn === 'white' && piece === piece.toUpperCase()) {
      selectedPiece = piece;
      selectedSquare = square;
      square.classList.add('selected');
    } else if (currentTurn === 'black' && piece === piece.toLowerCase()) {
      selectedPiece = piece;
      selectedSquare = square;
      square.classList.add('selected');
    }
  } else {
    // Move the selected piece to the new square
    const toRow = parseInt(square.dataset.row);
    const toCol = parseInt(square.dataset.col);

    // Example validation: only move to an empty square (you can add more logic here)
    if (isValidMove(selectedPiece, fromRow, fromCol, toRow, toCol)) {
      const move = { piece: selectedPiece, fromRow, fromCol, toRow, toCol };
      sendMove(move);  // Send the move to the other player
      applyMoveToBoard(move);  // Update the local board visually
      switchTurn();  // Change turn
    } else {
      // Invalid move, deselect the piece
      selectedPiece = null;
      selectedSquare.classList.remove('selected');
      selectedSquare = null;
    }
  }
}

// Example: Validate moves (you can improve this logic with real chess rules)
function isValidMove(piece, fromRow, fromCol, toRow, toCol) {
  return true;  // Always return true for now (for simplicity)
}

// Apply move to the chessboard visually
function applyMoveToBoard(move) {
  const fromSquare = document.querySelector(`[data-row="${move.fromRow}"][data-col="${move.fromCol}"]`);
  const toSquare = document.querySelector(`[data-row="${move.toRow}"][data-col="${move.toCol}"]`);

  toSquare.textContent = fromSquare.textContent;
  fromSquare.textContent = '';
}

// Switch turns
function switchTurn() {
  currentTurn = currentTurn === 'white' ? 'black' : 'white';
  document.getElementById('turnIndicator').textContent = `It's ${currentTurn}'s turn`;
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

// Handle video call setup
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    document.getElementById('localVideo').srcObject = stream;
  })
  .catch(err => console.error('Error accessing camera/mic:', err));

// Join signaling room
socket.emit('join-room', roomId);

// Set up signaling events
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
  applyMoveToBoard(move);  // Update the board with the received move
  switchTurn();  // Switch turns after the move
});

createBoard();  // Initialize the chess board

document.getElementById('startCall').addEventListener('click', createOffer);
