<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebRTC Chess Game</title>
  <style>
    #localVideo, #remoteVideo {
      width: 200px;
      height: 150px;
      margin: 10px;
    }
    #game-board {
      display: flex;
    }
  </style>
</head>
<body>
  <h1>WebRTC Chess Game</h1>
  
  <!-- Video elements -->
  <div>
    <video id="localVideo" autoplay muted></video>
    <video id="remoteVideo" autoplay></video>
  </div>
  
  <!-- Game board (for 3D rendering, placeholder) -->
  <div id="game-board">
    <canvas id="chess-board"></canvas>
  </div>

  <!-- JavaScript -->
  <script src="/socket.io/socket.io.js"></script>
  <script src="app.js"></script>
</body>
</html>
