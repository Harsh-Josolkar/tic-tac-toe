const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());


app.use(express.static(path.join(__dirname, '../dist')));

const server = http.createServer(app);


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  socket.on('join_room', (roomId, playerName, contestSize = 3) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: {},
        contestSize: contestSize,
        matchesPlayed: 0,
        gameState: {
          history: [Array(9).fill(null)],
          currentMove: 0
        },
        scores: { X: 0, O: 0 },
        seriesWinner: null,
        roundOver: false
      };
    }

    const room = rooms[roomId];

    let role = null;
    const playerKeys = Object.keys(room.players);
    if (playerKeys.length === 0) {
      role = 'X';
    } else if (playerKeys.length === 1) {
      role = 'O';
    } else {
      role = 'Spectator';
    }

    if (role !== 'Spectator') {
      room.players[socket.id] = { name: playerName, role };
    }

    socket.emit('joined', {
      role,
      gameState: room.gameState,
      scores: room.scores,
      players: Object.values(room.players),
      contestSize: room.contestSize,
      matchesPlayed: room.matchesPlayed,
      seriesWinner: room.seriesWinner
    });

    socket.to(roomId).emit('player_joined', Object.values(room.players));
  });

  socket.on('make_move', (roomId, newGameState) => {
    if (rooms[roomId]) {
      rooms[roomId].gameState = newGameState;
      socket.to(roomId).emit('game_updated', newGameState);
    }
  });

  socket.on('round_ended', (roomId, data) => {
    const room = rooms[roomId];
    if (room && !room.roundOver && !room.seriesWinner) {
      room.roundOver = true;
      room.matchesPlayed += 1;

      if (data.result === 'X' || data.result === 'O') {
        room.scores[data.result] += 1;
      }

      const remainingMatches = room.contestSize - room.matchesPlayed;

      if (room.scores.X > room.scores.O + remainingMatches) {
        room.seriesWinner = 'X';
      } else if (room.scores.O > room.scores.X + remainingMatches) {
        room.seriesWinner = 'O';
      } else if (remainingMatches === 0 && room.scores.X === room.scores.O) {
        room.seriesWinner = 'Draw';
      }

      io.to(roomId).emit('score_updated', {
        scores: room.scores,
        matchesPlayed: room.matchesPlayed,
        seriesWinner: room.seriesWinner
      });
    }
  });

  socket.on('reset_round', (roomId) => {
    const room = rooms[roomId];
    if (room) {
      room.roundOver = false;
      const resetState = {
        history: [Array(9).fill(null)],
        currentMove: 0
      };
      room.gameState = resetState;
      io.to(roomId).emit('game_updated', resetState);
    }
  });

  socket.on('reset_series', (roomId) => {
    const room = rooms[roomId];
    if (room) {
      room.roundOver = false;
      room.matchesPlayed = 0;
      room.scores = { X: 0, O: 0 };
      room.seriesWinner = null;

      const resetState = {
        history: [Array(9).fill(null)],
        currentMove: 0
      };
      room.gameState = resetState;

      io.to(roomId).emit('series_reset', {
        gameState: resetState,
        scores: room.scores,
        matchesPlayed: room.matchesPlayed,
        seriesWinner: null
      });
    }
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId] && rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit('player_left', Object.values(rooms[roomId].players));
      }
    }
  });

});

const PORT = process.env.PORT || 3001;
server.listen(PORT);
