import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Game State Types
interface DominoPiece {
  left: number;
  right: number;
}

interface Player {
  id: string;
  name: string;
  hand: DominoPiece[];
  score: number;
}

interface GameRoom {
  id: string;
  players: Player[];
  board: { piece: DominoPiece; ownerId: string }[]; // Simplified board for now
  deck: DominoPiece[];
  currentTurnIndex: number;
  status: 'waiting' | 'playing' | 'finished';
  config: {
    piecesPerPlayer: number;
  };
  leftEnd: number | null;
  rightEnd: number | null;
}

const rooms: Record<string, GameRoom> = {};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;

  // Socket.io Logic
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("create_room", ({ name, piecesPerPlayer }) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms[roomId] = {
        id: roomId,
        players: [{ id: socket.id, name, hand: [], score: 0 }],
        board: [],
        deck: [],
        currentTurnIndex: 0,
        status: 'waiting',
        config: { piecesPerPlayer: piecesPerPlayer || 7 },
        leftEnd: null,
        rightEnd: null
      };
      socket.join(roomId);
      socket.emit("room_created", roomId);
      io.to(roomId).emit("update_room", rooms[roomId]);
    });

    socket.on("join_room", ({ roomId, name }) => {
      const room = rooms[roomId];
      if (room && room.status === 'waiting' && room.players.length < 4) {
        room.players.push({ id: socket.id, name, hand: [], score: 0 });
        socket.join(roomId);
        io.to(roomId).emit("update_room", room);
      } else {
        socket.emit("error", "Sala não encontrada ou cheia");
      }
    });

    socket.on("start_game", (roomId) => {
      const room = rooms[roomId];
      if (room && room.players[0].id === socket.id) {
        // Generate Deck
        const deck: DominoPiece[] = [];
        for (let i = 0; i <= 6; i++) {
          for (let j = i; j <= 6; j++) {
            deck.push({ left: i, right: j });
          }
        }
        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        // Distribute
        room.players.forEach(player => {
          player.hand = deck.splice(0, room.config.piecesPerPlayer);
        });

        room.deck = deck;
        room.status = 'playing';
        room.board = [];
        room.leftEnd = null;
        room.rightEnd = null;
        room.currentTurnIndex = 0; // Should determine who starts (usually double 6)

        io.to(roomId).emit("game_started", room);
      }
    });

    socket.on("play_piece", ({ roomId, piece, side }) => { // side: 'left' or 'right'
      const room = rooms[roomId];
      if (!room || room.status !== 'playing') return;

      const player = room.players[room.currentTurnIndex];
      if (player.id !== socket.id) return;

      // Find piece in hand
      const pieceIndex = player.hand.findIndex(p => 
        (p.left === piece.left && p.right === piece.right) || 
        (p.left === piece.right && p.right === piece.left)
      );

      if (pieceIndex === -1) return; // Player doesn't have the piece

      const actualPiece = player.hand[pieceIndex];
      let playedPiece = { ...actualPiece };

      // First move
      if (room.board.length === 0) {
        room.board.push({ piece: playedPiece, ownerId: player.id });
        room.leftEnd = playedPiece.left;
        room.rightEnd = playedPiece.right;
      } else {
        // Validate move
        if (side === 'left') {
          if (playedPiece.right === room.leftEnd) {
            // Matches normally
          } else if (playedPiece.left === room.leftEnd) {
            // Need to flip
            playedPiece = { left: playedPiece.right, right: playedPiece.left };
          } else {
            return; // Invalid move
          }
          room.board.unshift({ piece: playedPiece, ownerId: player.id });
          room.leftEnd = playedPiece.left;
        } else if (side === 'right') {
          if (playedPiece.left === room.rightEnd) {
            // Matches normally
          } else if (playedPiece.right === room.rightEnd) {
            // Need to flip
            playedPiece = { left: playedPiece.right, right: playedPiece.left };
          } else {
            return; // Invalid move
          }
          room.board.push({ piece: playedPiece, ownerId: player.id });
          room.rightEnd = playedPiece.right;
        } else {
          return; // Invalid side
        }
      }

      // Remove from hand
      player.hand.splice(pieceIndex, 1);

      // Check Win
      if (player.hand.length === 0) {
        room.status = 'finished';
        io.to(roomId).emit("game_over", { winner: player });
      } else {
        // Next turn
        room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
      }

      io.to(roomId).emit("update_game", room);
    });

    socket.on("disconnect", () => {
      // Handle disconnection (remove player, delete room if empty)
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            delete rooms[roomId];
          } else {
            io.to(roomId).emit("update_room", room);
          }
          break;
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
