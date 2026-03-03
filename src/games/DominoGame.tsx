import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Copy, Users, Play, GripHorizontal, Share2, PlusCircle, SkipForward } from 'lucide-react';
import { cn } from '../lib/utils';
import { database } from '../lib/firebase';
import { ref, set, onValue, update, get, child, push, runTransaction } from 'firebase/database';

interface DominoGameProps {
  onBack: () => void;
}

interface DominoPiece {
  left: number;
  right: number;
}

interface Player {
  id: string;
  name: string;
  hand: DominoPiece[];
  score: number;
  isBot?: boolean;
}

interface GameRoom {
  id: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  config: {
    piecesPerPlayer: number;
  };
  board: { piece: DominoPiece; ownerId: string; orientation?: 'vertical' | 'horizontal' }[];
  drawPile: DominoPiece[];
  currentTurnIndex: number;
  leftEnd: number | null;
  rightEnd: number | null;
  winner?: Player;
  lastAction?: string;
  turnDeadline?: number;
}

export function DominoGame({ onBack }: DominoGameProps) {
  const [view, setView] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('domino_player_name') || '');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [piecesConfig, setPiecesConfig] = useState(6);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [playerId, setPlayerId] = useState(() => {
    const stored = localStorage.getItem('domino_player_id');
    if (stored) return stored;
    const newId = Math.random().toString(36).substr(2, 9);
    localStorage.setItem('domino_player_id', newId);
    return newId;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<DominoPiece | null>(null);
  const leftZoneRef = useRef<HTMLDivElement>(null);
  const rightZoneRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (playerName) {
      localStorage.setItem('domino_player_name', playerName);
    }
  }, [playerName]);

  // Clear selection when turn changes or piece played
  useEffect(() => {
    setSelectedPiece(null);
  }, [room?.currentTurnIndex, room?.board?.length]);

  // Timer Logic
  useEffect(() => {
    if (!room || room.status !== 'playing' || !room.turnDeadline) return;

    const interval = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((room.turnDeadline! - Date.now()) / 1000));
      setTimeLeft(seconds);

      if (seconds === 0 && room.players[room.currentTurnIndex].id === playerId) {
        // Time's up! Auto-play logic
        // For simplicity, just pass turn or play random if possible
        // Ideally, we should try to play a random valid piece
        const player = room.players.find(p => p.id === playerId);
        if (player) {
           // Try to find a valid move
           const left = room.leftEnd;
           const right = room.rightEnd;
           const validPiece = player.hand.find(p => 
             !room.board.length || p.left === left || p.right === left || p.left === right || p.right === right
           );

           if (validPiece) {
             const side = (!room.board.length || validPiece.left === left || validPiece.right === left) ? 'left' : 'right';
             playPiece(validPiece, side);
           } else {
             if (room.config.piecesPerPlayer === 3 && room.drawPile.length > 0) {
               buyPiece();
             } else {
               passTurn();
             }
           }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.turnDeadline, room?.currentTurnIndex, playerId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomIdInput(roomParam);
    }
  }, []);

  // Listen for room updates
  useEffect(() => {
    if (!room?.id) return;

    const roomRef = ref(database, `rooms/${room.id}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoom(data);
        if (data.status === 'playing' && view !== 'game') {
          setView('game');
        } else if (data.status === 'waiting' && view !== 'lobby') {
            setView('lobby');
        }
      } else {
        // Room deleted or doesn't exist
        setRoom(null);
        setView('menu');
        setError('Sala encerrada ou não encontrada.');
      }
    });

    return () => unsubscribe();
  }, [room?.id, view]);

  // Bot Logic Effect
  useEffect(() => {
    if (!room || room.status !== 'playing') return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (currentPlayer?.isBot) {
      const timer = setTimeout(() => {
        executeBotTurn();
      }, 1500); // 1.5s delay for realism
      return () => clearTimeout(timer);
    }
  }, [room?.currentTurnIndex, room?.status, room?.lastAction]); // Re-run when turn changes or last action updates (e.g. after buy)

  const executeBotTurn = async () => {
    if (!room) return;
    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer.isBot) return;

    // 1. Check for valid moves
    const left = room.leftEnd;
    const right = room.rightEnd;
    const hand = currentPlayer.hand || [];

    // If board is empty (bot starts), play highest double or random
    if (!room.board || room.board.length === 0) {
      // Find highest double
      let bestPieceIndex = -1;
      let maxDouble = -1;
      
      hand.forEach((p, i) => {
        if (p.left === p.right && p.left > maxDouble) {
          maxDouble = p.left;
          bestPieceIndex = i;
        }
      });

      // If no double, pick random
      if (bestPieceIndex === -1) {
        bestPieceIndex = Math.floor(Math.random() * hand.length);
      }

      if (bestPieceIndex !== -1) {
        await playPiece(hand[bestPieceIndex], 'left'); // Side doesn't matter for first piece
      }
      return;
    }

    // Find valid moves
    const validMoves: { piece: DominoPiece, side: 'left' | 'right' }[] = [];
    
    hand.forEach(p => {
      if (p.left === left || p.right === left) validMoves.push({ piece: p, side: 'left' });
      if (p.left === right || p.right === right) validMoves.push({ piece: p, side: 'right' });
    });

    if (validMoves.length > 0) {
      // Pick a move (random for now, or heuristic)
      // Simple heuristic: play doubles first, then highest value
      validMoves.sort((a, b) => {
        const isDoubleA = a.piece.left === a.piece.right;
        const isDoubleB = b.piece.left === b.piece.right;
        if (isDoubleA && !isDoubleB) return -1;
        if (!isDoubleA && isDoubleB) return 1;
        return (b.piece.left + b.piece.right) - (a.piece.left + a.piece.right);
      });

      const move = validMoves[0];
      await playPiece(move.piece, move.side);
    } else {
      // No valid moves
      if (room.config.piecesPerPlayer === 3 && room.drawPile && room.drawPile.length > 0) {
        await buyPiece();
      } else {
        await passTurn();
      }
    }
  };

  const generateRoomId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const startBotGame = async () => {
    if (!playerName) {
      setError('Digite seu nome');
      return;
    }

    const newRoomId = generateRoomId();
    
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

    // Create Players (Human + 1 Bot)
    const humanHand = deck.splice(0, piecesConfig);
    const botHand = deck.splice(0, piecesConfig);

    const players: Player[] = [
      {
        id: playerId,
        name: playerName,
        hand: humanHand,
        score: 0
      },
      {
        id: 'bot-1',
        name: 'Robô',
        hand: botHand,
        score: 0,
        isBot: true
      }
    ];

    // Determine who starts (Prioritize 6:6)
    let startIndex = 0;
    let foundDoubleSix = false;
    
    // First check for 6:6
    players.forEach((p, idx) => {
      if (p.hand.some(piece => piece.left === 6 && piece.right === 6)) {
        startIndex = idx;
        foundDoubleSix = true;
      }
    });

    // If no 6:6, check for other doubles or random
    if (!foundDoubleSix) {
      let maxDouble = -1;
      players.forEach((p, idx) => {
        p.hand.forEach(piece => {
          if (piece.left === piece.right && piece.left > maxDouble) {
            maxDouble = piece.left;
            startIndex = idx;
          }
        });
      });
      
      if (maxDouble === -1) {
        startIndex = Math.floor(Math.random() * players.length);
      }
    }

    const newRoom: GameRoom = {
      id: newRoomId,
      players: players,
      status: 'playing',
      config: {
        piecesPerPlayer: piecesConfig
      },
      board: [],
      drawPile: deck,
      currentTurnIndex: startIndex,
      leftEnd: null,
      rightEnd: null,
      consecutivePasses: 0,
      lastAction: 'Jogo contra Bot iniciado!',
      turnDeadline: Date.now() + 60000 // 1 minute
    };

    try {
      await set(ref(database, `rooms/${newRoomId}`), newRoom);
      setRoom(newRoom);
      setView('game');
    } catch (e) {
      console.error(e);
      setError('Erro ao iniciar jogo com bot.');
    }
  };

  const createRoom = async () => {
    if (!playerName) {
      setError('Digite seu nome');
      return;
    }

    const newRoomId = generateRoomId();
    const newRoom: GameRoom = {
      id: newRoomId,
      players: [{
        id: playerId,
        name: playerName,
        hand: [],
        score: 0
      }],
      status: 'waiting',
      config: {
        piecesPerPlayer: piecesConfig
      },
      board: [],
      drawPile: [],
      currentTurnIndex: 0,
      leftEnd: null,
      rightEnd: null,
      consecutivePasses: 0
    };

    try {
      await set(ref(database, `rooms/${newRoomId}`), newRoom);
      setRoom(newRoom);
      setView('lobby');
    } catch (e) {
      console.error(e);
      setError('Erro ao criar sala. Tente novamente.');
    }
  };

  const joinRoom = async () => {
    if (!playerName || !roomIdInput) {
      setError('Preencha nome e código da sala');
      return;
    }

    const roomId = roomIdInput.toUpperCase();
    const roomRef = ref(database, `rooms/${roomId}`);

    try {
      const snapshot = await get(roomRef);
      if (snapshot.exists()) {
        const currentRoom = snapshot.val() as GameRoom;
        
        if (currentRoom.status !== 'waiting') {
          setError('Jogo já começou!');
          return;
        }

        if (currentRoom.players.some(p => p.id === playerId)) {
           // Rejoining
           setRoom(currentRoom);
           setView('lobby');
           return;
        }

        if (currentRoom.players.length >= 4) {
          setError('Sala cheia!');
          return;
        }

        const updatedPlayers = [...currentRoom.players, {
          id: playerId,
          name: playerName,
          hand: [],
          score: 0
        }];

        await update(roomRef, { players: updatedPlayers });
        setRoom({ ...currentRoom, players: updatedPlayers });
        setView('lobby');
      } else {
        setError('Sala não encontrada');
      }
    } catch (e) {
      console.error(e);
      setError('Erro ao entrar na sala');
    }
  };

  const startGame = async () => {
    if (!room) return;

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
    const updatedPlayers = room.players.map(player => {
      const hand = deck.splice(0, room.config.piecesPerPlayer);
      return { ...player, hand };
    });

    // Determine who starts (Double 6 or highest double)
    let startIndex = 0;
    let maxDouble = -1;
    
    updatedPlayers.forEach((p, idx) => {
      p.hand.forEach(piece => {
        if (piece.left === piece.right && piece.left > maxDouble) {
          maxDouble = piece.left;
          startIndex = idx;
        }
      });
    });

    // If no doubles, just random or keep 0 (fallback)
    if (maxDouble === -1) {
      startIndex = Math.floor(Math.random() * updatedPlayers.length);
    }
    
    await update(ref(database, `rooms/${room.id}`), {
      status: 'playing',
      players: updatedPlayers,
      board: [],
      drawPile: deck, // Remaining pieces go to the "monte"
      currentTurnIndex: startIndex,
      leftEnd: null,
      rightEnd: null,
      lastAction: 'Jogo iniciado!',
      consecutivePasses: 0
    });
  };

  const buyPiece = async () => {
    if (!room) return;
    
    // Only allowed if piecesPerPlayer is 3
    if (room.config.piecesPerPlayer !== 3) {
      setError('Compra não permitida nesta modalidade!');
      return;
    }

    // Optimistic check (allow bot or current player)
    const currentPlayer = room.players[room.currentTurnIndex];
    const isBotTurn = currentPlayer.isBot;
    
    // If it's human turn, check ID. If bot turn, allow execution (since we are the host)
    if (!isBotTurn && currentPlayer.id !== playerId) return;
    
    if (!room.drawPile || room.drawPile.length === 0) {
      if (!isBotTurn) setError('Monte vazio!');
      return;
    }

    const newDrawPile = [...room.drawPile];
    const piece = newDrawPile.pop(); // Take from top
    
    if (!piece) return;

    const playerIndex = room.currentTurnIndex;
    const player = room.players[playerIndex];
    const newHand = [...(player.hand || []), piece];
    
    const updatedPlayers = [...room.players];
    updatedPlayers[playerIndex] = { ...player, hand: newHand };

    await update(ref(database, `rooms/${room.id}`), {
      drawPile: newDrawPile,
      players: updatedPlayers,
      lastAction: `${player.name} comprou uma peça.`
    });
  };

  const passTurn = async () => {
    if (!room) return;
    
    const currentPlayer = room.players[room.currentTurnIndex];
    const isBotTurn = currentPlayer.isBot;

    if (!isBotTurn && currentPlayer.id !== playerId) return;

    // Rule: must buy until you can play IF piecesPerPlayer is 3 and pile not empty
    if (room.config.piecesPerPlayer === 3 && room.drawPile && room.drawPile.length > 0) {
      if (!isBotTurn) setError('Você deve comprar peças!');
      return;
    }

    const nextTurn = (room.currentTurnIndex + 1) % room.players.length;
    const newConsecutivePasses = (room.consecutivePasses || 0) + 1;
    
    let updates: any = {
      currentTurnIndex: nextTurn,
      lastAction: `${currentPlayer.name} passou a vez.`,
      consecutivePasses: newConsecutivePasses
    };

    // Check if game is blocked (everyone passed)
    if (newConsecutivePasses >= room.players.length) {
      updates.status = 'finished';
      
      // Calculate winner by lowest points
      let minPoints = Infinity;
      let winner = null;
      
      room.players.forEach(p => {
        const points = (p.hand || []).reduce((sum, piece) => sum + piece.left + piece.right, 0);
        if (points < minPoints) {
          minPoints = points;
          winner = p;
        }
      });
      
      updates.winner = winner;
      updates.lastAction = `Jogo travado! ${winner?.name} venceu com menos pontos.`;
    }
    
    await update(ref(database, `rooms/${room.id}`), updates);
  };

  const playPiece = async (piece: DominoPiece, side: 'left' | 'right') => {
    if (!room) return;
    
    const currentPlayer = room.players[room.currentTurnIndex];
    const isBotTurn = currentPlayer.isBot;

    if (!isBotTurn && currentPlayer.id !== playerId) return;

    const playerIndex = room.currentTurnIndex;
    const player = room.players[playerIndex];
    
    // Find piece index in hand (handle both orientations in hand)
    const pieceIndex = player.hand.findIndex(p => 
      (p.left === piece.left && p.right === piece.right) || 
      (p.left === piece.right && p.right === piece.left)
    );

    if (pieceIndex === -1) return;

    let playedPiece = { ...player.hand[pieceIndex] };
    let newBoard = [...(room.board || [])];
    let newLeftEnd = room.leftEnd;
    let newRightEnd = room.rightEnd;
    let orientation: 'vertical' | 'horizontal' = 'horizontal';

    if (newBoard.length === 0) {
      // First piece
      const isDouble = playedPiece.left === playedPiece.right;
      orientation = isDouble ? 'vertical' : 'horizontal';
      
      newBoard.push({ piece: playedPiece, ownerId: player.id, orientation });
      newLeftEnd = playedPiece.left;
      newRightEnd = playedPiece.right;
    } else {
      if (side === 'left') {
        if (playedPiece.right === newLeftEnd) {
          // matches normally
        } else if (playedPiece.left === newLeftEnd) {
          playedPiece = { left: playedPiece.right, right: playedPiece.left };
        } else {
          if (!isBotTurn) {
            setError('Jogada inválida!');
            setTimeout(() => setError(''), 2000);
          }
          return;
        }
        
        const isDouble = playedPiece.left === playedPiece.right;
        orientation = isDouble ? 'vertical' : 'horizontal';
        
        newBoard.unshift({ piece: playedPiece, ownerId: player.id, orientation });
        newLeftEnd = playedPiece.left;
      } else {
        if (playedPiece.left === newRightEnd) {
          // matches normally
        } else if (playedPiece.right === newRightEnd) {
          playedPiece = { left: playedPiece.right, right: playedPiece.left };
        } else {
          if (!isBotTurn) {
            setError('Jogada inválida!');
            setTimeout(() => setError(''), 2000);
          }
          return;
        }

        const isDouble = playedPiece.left === playedPiece.right;
        orientation = isDouble ? 'vertical' : 'horizontal';

        newBoard.push({ piece: playedPiece, ownerId: player.id, orientation });
        newRightEnd = playedPiece.right;
      }
    }

    const newHand = [...player.hand];
    newHand.splice(pieceIndex, 1);
    
    const updatedPlayers = [...room.players];
    updatedPlayers[playerIndex] = { ...player, hand: newHand };

    let updates: any = {
      board: newBoard,
      players: updatedPlayers,
      leftEnd: newLeftEnd,
      rightEnd: newRightEnd,
      currentTurnIndex: (room.currentTurnIndex + 1) % room.players.length,
      lastAction: `${player.name} jogou [${playedPiece.left}|${playedPiece.right}]`,
      consecutivePasses: 0, // Reset pass counter on successful play
      turnDeadline: Date.now() + 60000 // Reset timer
    };

    if (newHand.length === 0) {
      updates.status = 'finished';
      
      // Calculate points from losers
      let totalPoints = 0;
      room.players.forEach((p, idx) => {
        if (idx !== playerIndex) {
           totalPoints += (p.hand || []).reduce((sum, piece) => sum + piece.left + piece.right, 0);
        }
      });

      updatedPlayers[playerIndex].score += totalPoints;
      updates.players = updatedPlayers;
      updates.winner = updatedPlayers[playerIndex];
      updates.lastAction = `${player.name} bateu! (+${totalPoints} pts)`;
    }

    await update(ref(database, `rooms/${room.id}`), updates);
  };

  const copyRoomCode = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
    }
  };

  const shareRoom = async () => {
    if (!room?.id) return;
    const url = `${window.location.origin}${window.location.pathname}?game=domino&room=${room.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Jogue Dominó Comigo!',
          text: `Entre na minha sala de Dominó: ${room.id}`,
          url: url
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado para a área de transferência!');
    }
  };

  // --- Visual Rendering Helpers ---

  // Dot positions grid (3x3)
  // 0 1 2
  // 3 4 5
  // 6 7 8
  const getDotPositions = (num: number) => {
    switch (num) {
      case 1: return [4];
      case 2: return [2, 6]; // Top-right, Bottom-left
      case 3: return [2, 4, 6];
      case 4: return [0, 2, 6, 8];
      case 5: return [0, 2, 4, 6, 8];
      case 6: return [0, 2, 3, 5, 6, 8]; // Two rows of 3
      default: return [];
    }
  };

  const renderDots = (num: number, isSmall: boolean) => {
    const positions = getDotPositions(num);
    return (
      <div className={cn("grid grid-cols-3 grid-rows-3 w-full h-full p-[2px]", isSmall ? "gap-[1px]" : "gap-0.5")}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            {positions.includes(i) && (
              <div className={cn(
                "rounded-full bg-black",
                isSmall ? "w-1 h-1" : "w-2.5 h-2.5" // Thicker dots for player hand
              )} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPiece = (piece: DominoPiece, isSmall = false, orientation: 'vertical' | 'horizontal' = 'vertical', scale = 1) => {
    const isHorizontal = orientation === 'horizontal';
    
    // Dimensions based on size and orientation
    // Small (Board): Vertical 24x48 (w-6 h-12), Horizontal 48x24 (w-12 h-6)
    // Large (Hand): Vertical 48x96 (w-12 h-24)
    
    let baseWidth = isSmall ? (isHorizontal ? 48 : 24) : (isHorizontal ? 96 : 48);
    let baseHeight = isSmall ? (isHorizontal ? 24 : 48) : (isHorizontal ? 48 : 96);

    // Apply scale
    const width = baseWidth * scale;
    const height = baseHeight * scale;
    
    // Tailwind classes for size are static, so we use inline styles for dynamic scaling if needed, 
    // or just stick to a few preset sizes.
    // Let's use a "mobile-friendly" size for hand pieces.

    let sizeClass = "";
    if (isSmall) {
      sizeClass = isHorizontal ? "w-12 h-6" : "w-6 h-12";
    } else {
      // Hand pieces: smaller on mobile, larger on desktop
      sizeClass = isHorizontal ? "w-16 h-8 md:w-24 md:h-12" : "w-8 h-16 md:w-12 md:h-24";
    }

    return (
      <div 
        className={cn(
          "relative bg-white rounded flex items-center justify-between select-none overflow-hidden border border-slate-400 shadow-sm",
          isHorizontal ? "flex-row" : "flex-col",
          sizeClass
        )}
      >
        <div className="flex-1 w-full h-full flex items-center justify-center">
          {renderDots(piece.left, isSmall)}
        </div>
        <div className={cn("bg-slate-400", isHorizontal ? "w-[1px] h-full" : "w-full h-[1px]")}></div>
        <div className="flex-1 w-full h-full flex items-center justify-center">
          {renderDots(piece.right, isSmall)}
        </div>
      </div>
    );
  };

  // Check if current player has any valid moves
  const canPlay = () => {
    if (!room || !room.board || room.board.length === 0) return true; // Can always play first piece if it's their turn (logic handled elsewhere)
    
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    const left = room.leftEnd;
    const right = room.rightEnd;

    return (player.hand || []).some(p => 
      p.left === left || p.right === left || p.left === right || p.right === right
    );
  };

  const isMyTurn = room?.players[room.currentTurnIndex]?.id === playerId;
  const hasValidMove = canPlay();
  const canBuy = room?.config.piecesPerPlayer === 3 && room?.drawPile && room.drawPile.length > 0;

  return (
    <div className="h-full flex flex-col relative bg-[#1a472a] text-slate-50 overflow-hidden font-sans">
      {/* Wood texture overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/wood-pattern.png")' }}></div>

      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <button 
          onClick={onBack}
          className="p-2 text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold tracking-wider flex items-center gap-2 text-[#f0d0a0] drop-shadow-md">
          <GripHorizontal /> DOMINÓ CLÁSSICO
        </h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 pt-20 overflow-y-auto w-full relative z-0">
        <AnimatePresence mode="wait">
          {view === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md space-y-6"
            >
              <div className="bg-black/40 p-6 rounded-2xl border border-white/10 space-y-4 backdrop-blur-md shadow-2xl">
                <h2 className="text-2xl font-bold text-center mb-6 text-[#f0d0a0]">Novo Jogo</h2>
                
                <div className="space-y-2">
                  <label className="text-sm text-green-200 font-bold uppercase">Seu Nome</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Como quer ser chamado?"
                    className="w-full bg-black/30 border border-green-800 rounded-xl p-4 text-white placeholder-green-600 focus:outline-none focus:border-[#f0d0a0] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs text-green-300 font-bold uppercase">Pedras Iniciais</label>
                    <div className="flex bg-black/30 rounded-xl p-1 border border-green-800">
                      {[3, 6, 7].map(num => (
                        <button
                          key={num}
                          onClick={() => setPiecesConfig(num)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                            piecesConfig === num ? "bg-[#f0d0a0] text-black shadow-lg" : "text-green-400 hover:text-green-200"
                          )}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={createRoom}
                  className="w-full bg-[#f0d0a0] hover:bg-[#e0c090] text-black font-bold py-4 rounded-xl shadow-[0px_4px_0px_0px_#b09060] active:shadow-none active:translate-y-[4px] transition-all mt-4"
                >
                  Criar Sala
                </button>

                <button
                  onClick={startBotGame}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-[0px_4px_0px_0px_#1e40af] active:shadow-none active:translate-y-[4px] transition-all mt-2 flex items-center justify-center gap-2"
                >
                  <Users size={20} />
                  Jogar contra Bot
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink-0 mx-4 text-green-300 text-xs uppercase">Ou entre em uma</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    placeholder="Código da Sala"
                    className="w-full bg-black/30 border border-green-800 rounded-xl p-4 text-white placeholder-green-600 focus:outline-none focus:border-[#f0d0a0] transition-colors uppercase text-center"
                  />
                  <button
                    onClick={joinRoom}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl shadow-[0px_4px_0px_0px_#334155] active:shadow-none active:translate-y-[4px] transition-all"
                  >
                    Entrar
                  </button>
                </div>
              </div>
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/90 text-white p-3 rounded-lg text-center text-sm font-bold shadow-lg"
                >
                  {error}
                </motion.div>
              )}
            </motion.div>
          )}

          {view === 'lobby' && room && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md space-y-6 text-center"
            >
              <div className="bg-black/40 p-8 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
                <h2 className="text-slate-300 text-sm uppercase tracking-widest mb-4">Código da Sala</h2>
                
                <div className="flex flex-col items-center gap-4 mb-8">
                  <div 
                    onClick={copyRoomCode}
                    className="bg-black/30 border-2 border-[#f0d0a0]/30 rounded-2xl px-8 py-4 flex items-center gap-4 cursor-pointer hover:bg-black/50 transition-colors group"
                  >
                    <span className="text-5xl font-mono font-bold text-[#f0d0a0] tracking-widest group-hover:scale-105 transition-transform">
                      {room.id}
                    </span>
                    <Copy size={24} className="text-[#f0d0a0] group-hover:text-white transition-colors" />
                  </div>

                  <button
                    onClick={shareRoom}
                    className="flex items-center gap-2 text-[#f0d0a0] hover:text-white transition-colors text-sm font-bold uppercase tracking-wider bg-black/30 px-4 py-2 rounded-full hover:bg-black/50"
                  >
                    <Share2 size={16} />
                    Compartilhar Link
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-300 mb-4">
                    <Users size={20} />
                    <span className="font-bold">{room.players.length} Jogadores</span>
                  </div>
                  
                  <div className="space-y-2">
                    {room.players.map((player) => (
                      <div key={player.id} className="bg-white/5 p-3 rounded-xl flex items-center justify-between border border-white/10">
                        <span className="font-bold text-white">{player.name}</span>
                        {player.id === playerId && <span className="text-xs bg-[#f0d0a0] text-black font-bold px-2 py-1 rounded">Você</span>}
                      </div>
                    ))}
                    {Array.from({ length: 4 - room.players.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="border-2 border-dashed border-white/10 p-3 rounded-xl text-white/30 font-bold">
                        Aguardando...
                      </div>
                    ))}
                  </div>
                </div>

                {room.players[0].id === playerId && (
                  <button
                    onClick={startGame}
                    disabled={room.players.length < 2}
                    className="w-full mt-8 bg-[#f0d0a0] hover:bg-[#e0c090] disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none text-black font-bold py-4 rounded-xl shadow-[0px_4px_0px_0px_#b09060] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={20} />
                    Iniciar Jogo
                  </button>
                )}
                
                {room.players[0].id !== playerId && (
                  <p className="mt-8 text-[#f0d0a0] animate-pulse font-bold">Aguardando líder iniciar...</p>
                )}
              </div>
            </motion.div>
          )}

          {view === 'game' && room && (
            <div className="w-full h-full flex flex-col">
              {/* Game Info */}
              <div className="flex justify-between items-center px-4 py-2 bg-black/30 backdrop-blur-sm border-b border-white/5">
                <div className="text-sm text-green-300">
                  Turno de: <span className="font-bold text-[#f0d0a0] text-lg ml-1">{room.players[room.currentTurnIndex].name}</span>
                </div>
                <div className="text-xs text-white/50">
                  Monte: {room.drawPile?.length || 0}
                </div>
              </div>

              {/* Status Message */}
              {room.lastAction && (
                <div className="bg-black/40 text-white text-center text-xs py-1 px-4 mx-auto mt-2 rounded-full backdrop-blur-sm border border-white/10">
                  {room.lastAction}
                </div>
              )}

              {/* Game Over Modal */}
              <AnimatePresence>
                {room.status === 'finished' && room.winner && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      className="bg-[#1a472a] border-2 border-[#f0d0a0] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
                    >
                      {/* Confetti effect background (simplified) */}
                      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>
                      
                      <div className="relative z-10 space-y-6">
                        <div className="text-[#f0d0a0] uppercase tracking-widest text-sm font-bold">Fim de Jogo</div>
                        
                        <div className="space-y-2">
                          <h2 className="text-3xl font-bold text-white">
                            {room.winner.id === playerId ? "VOCÊ VENCEU!" : "VENCEDOR"}
                          </h2>
                          <div className="text-xl text-[#f0d0a0] font-bold bg-black/30 py-2 px-4 rounded-lg inline-block">
                            {room.winner.name}
                          </div>
                        </div>

                        <div className="text-green-200 text-sm">
                          {room.lastAction?.includes("travado") ? "O jogo travou e venceu quem tinha menos pontos." : "Bateu e limpou a mão!"}
                        </div>

                        {room.players[0].id === playerId ? (
                          <button
                            onClick={startGame}
                            className="w-full bg-[#f0d0a0] hover:bg-[#e0c090] text-black font-bold py-3 rounded-xl shadow-[0px_4px_0px_0px_#b09060] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
                          >
                            <Play size={20} />
                            Jogar Novamente
                          </button>
                        ) : (
                          <div className="text-white/50 text-xs animate-pulse">
                            Aguardando líder iniciar nova partida...
                          </div>
                        )}
                        
                        <button
                          onClick={() => {
                            setRoom(null);
                            setView('menu');
                          }}
                          className="text-white/50 hover:text-white text-sm underline decoration-white/30 hover:decoration-white transition-all"
                        >
                          Sair da Sala
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Game Board Area */}
              <div ref={boardRef} className="flex-1 rounded-xl m-2 flex items-center justify-center relative overflow-hidden p-4 shadow-inner bg-[#11301c]">
                {(!room.board || room.board.length === 0) ? (
                  <div 
                    ref={leftZoneRef} // Use left zone as the single drop zone for empty board
                    onClick={() => {
                      if (selectedPiece) {
                        playPiece(selectedPiece, 'left');
                        setSelectedPiece(null);
                      }
                    }}
                    className={cn(
                      "w-64 h-32 border-4 border-dashed rounded-xl flex items-center justify-center transition-all cursor-pointer",
                      (isDragging || selectedPiece) ? "border-[#f0d0a0] bg-[#f0d0a0]/20 scale-105 animate-pulse" : "border-white/10"
                    )}
                  >
                    <div className="text-white/20 font-bold text-xl uppercase tracking-widest text-center pointer-events-none">
                      {(isDragging || selectedPiece) ? "Toque aqui para jogar" : (isMyTurn ? "Sua vez!" : "Aguardando...")}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-8">
                    {/* Snake Layout Container - Adjusted max-width for wrapping */}
                    <div className="flex flex-wrap items-center justify-center max-w-[600px] md:max-w-[700px]">
                      
                      {/* Left Drop Zone */}
                      <div 
                        ref={leftZoneRef}
                        onClick={() => {
                          if (selectedPiece) {
                            playPiece(selectedPiece, 'left');
                            setSelectedPiece(null);
                          }
                        }}
                        className={cn(
                          "w-12 h-24 border-2 border-dashed rounded-lg flex-shrink-0 transition-all duration-300 cursor-pointer flex items-center justify-center",
                          (isDragging || selectedPiece) ? "opacity-100 border-[#f0d0a0] bg-[#f0d0a0]/20 scale-110 animate-pulse" : "opacity-0 w-0 border-transparent overflow-hidden"
                        )}
                      >
                         {(isDragging || selectedPiece) && <div className="w-8 h-8 rounded-full bg-[#f0d0a0]/50 animate-ping" />}
                      </div>

                      {room.board.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex-shrink-0 -ml-[1px] -mt-[1px]" // Negative margin to overlap borders slightly and remove gaps
                        >
                          {renderPiece(item.piece, true, item.orientation)}
                        </motion.div>
                      ))}

                      {/* Right Drop Zone */}
                      <div 
                        ref={rightZoneRef}
                        onClick={() => {
                          if (selectedPiece) {
                            playPiece(selectedPiece, 'right');
                            setSelectedPiece(null);
                          }
                        }}
                        className={cn(
                          "w-12 h-24 border-2 border-dashed rounded-lg flex-shrink-0 transition-all duration-300 cursor-pointer flex items-center justify-center",
                          (isDragging || selectedPiece) ? "opacity-100 border-[#f0d0a0] bg-[#f0d0a0]/20 scale-110 animate-pulse" : "opacity-0 w-0 border-transparent overflow-hidden"
                        )}
                      >
                        {(isDragging || selectedPiece) && <div className="w-8 h-8 rounded-full bg-[#f0d0a0]/50 animate-ping" />}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Opponents Hands */}
                <div className="absolute top-2 right-2 flex gap-2">
                  {room.players.filter(p => p.id !== playerId).map(p => (
                    <div key={p.id} className="bg-black/60 p-2 rounded-lg border border-white/10 text-xs text-center backdrop-blur-sm">
                      <div className="font-bold text-[#f0d0a0]">{p.name}</div>
                      <div className="text-white flex items-center justify-center gap-1">
                        <div className="w-3 h-4 bg-white/20 rounded-sm"></div>
                        {p.hand?.length || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Player Hand & Controls */}
              <div className={cn(
                "bg-black/80 border-t border-[#f0d0a0]/30 p-4 pb-8 backdrop-blur-md relative z-20 transition-all duration-500",
                isMyTurn && "bg-[#f0d0a0]/10 shadow-[0_-4px_20px_rgba(240,208,160,0.2)]" // Highlight active hand
              )}>
                <div className="flex justify-between items-center mb-4 px-2">
                  <p className={cn(
                    "text-xs uppercase font-bold transition-colors",
                    isMyTurn ? "text-[#f0d0a0] animate-pulse" : "text-white/50"
                  )}>
                    {isMyTurn ? "Sua Vez! Arraste uma peça para a mesa" : "Aguarde..."}
                  </p>
                  
                  {isMyTurn && !hasValidMove && (
                    <div className="flex gap-2">
                      {canBuy ? (
                        <button 
                          onClick={buyPiece}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg flex items-center gap-2 animate-bounce"
                        >
                          <PlusCircle size={16} />
                          COMPRAR PEÇA
                        </button>
                      ) : (
                        <button 
                          onClick={passTurn}
                          className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg flex items-center gap-2"
                        >
                          <SkipForward size={16} />
                          PASSAR VEZ
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-2 pb-4 px-4 min-h-[140px] items-center overflow-y-auto max-h-[200px]">
                  {room.players.find(p => p.id === playerId)?.hand?.map((piece, i) => (
                    <motion.div
                      key={i}
                      drag={isMyTurn}
                      dragSnapToOrigin
                      dragElastic={0.1}
                      dragMomentum={false}
                      onClick={() => {
                        if (isMyTurn) {
                           if (selectedPiece === piece) {
                             setSelectedPiece(null); // Deselect
                           } else {
                             setSelectedPiece(piece); // Select
                           }
                        }
                      }}
                      onDragStart={() => {
                        setIsDragging(true);
                        setSelectedPiece(piece); // Auto-select on drag
                      }}
                      onDragEnd={(_, info) => {
                        setIsDragging(false);
                        if (!isMyTurn) return;

                        const dropPoint = { x: info.point.x, y: info.point.y };
                        
                        // Check collision with Left Zone
                        if (leftZoneRef.current) {
                          const rect = leftZoneRef.current.getBoundingClientRect();
                          // Expand hit area slightly for better UX
                          const padding = 50; 
                          if (
                            dropPoint.x >= rect.left - padding && 
                            dropPoint.x <= rect.right + padding && 
                            dropPoint.y >= rect.top - padding && 
                            dropPoint.y <= rect.bottom + padding
                          ) {
                            playPiece(piece, 'left');
                            setSelectedPiece(null);
                            return;
                          }
                        }

                        // Check collision with Right Zone
                        if (rightZoneRef.current) {
                          const rect = rightZoneRef.current.getBoundingClientRect();
                          const padding = 50;
                          if (
                            dropPoint.x >= rect.left - padding && 
                            dropPoint.x <= rect.right + padding && 
                            dropPoint.y >= rect.top - padding && 
                            dropPoint.y <= rect.bottom + padding
                          ) {
                            playPiece(piece, 'right');
                            setSelectedPiece(null);
                            return;
                          }
                        }
                      }}
                      className={cn(
                        "relative flex-shrink-0 touch-none transition-all duration-300 cursor-pointer", 
                        isMyTurn ? "brightness-125 drop-shadow-[0_0_15px_rgba(240,208,160,0.6)] scale-105 ring-2 ring-[#f0d0a0]/50" : "opacity-50 cursor-not-allowed grayscale scale-95",
                        selectedPiece === piece && "ring-4 ring-green-500 -translate-y-4 z-50" // Visual feedback for selection
                      )}
                      style={{ zIndex: (isDragging || selectedPiece === piece) ? 50 : 1 }}
                    >
                      {renderPiece(piece, false, 'vertical')}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
