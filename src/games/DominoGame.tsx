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
    difficulty?: 'easy' | 'medium' | 'hard';
  };
  board: { piece: DominoPiece; ownerId: string; orientation?: 'vertical' | 'horizontal' }[];
  drawPile: DominoPiece[];
  currentTurnIndex: number;
  leftEnd: number | null;
  rightEnd: number | null;
  winner?: Player;
  lastAction?: string;
  turnDeadline?: number;
  consecutivePasses?: number;
}

export function DominoGame({ onBack }: DominoGameProps) {
  const [view, setView] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('domino_player_name') || '');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [piecesConfig, setPiecesConfig] = useState(6);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<DominoPiece | null>(null);
  
  const [boardWidth, setBoardWidth] = useState(window.innerWidth);
  const [scale, setScale] = useState(1);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [layoutPieces, setLayoutPieces] = useState<any[]>([]);
  const [zonePositions, setZonePositions] = useState<{left: any, right: any}>({ left: {}, right: {} });
  
  const leftZoneRef = useRef<HTMLDivElement>(null);
  const rightZoneRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boardRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setBoardWidth(entry.contentRect.width);
      }
    });
    observer.observe(boardRef.current);
    return () => observer.disconnect();
  }, []);

  // Layout Constants
  const PIECE_WIDTH = 80;
  const PIECE_HEIGHT = 40;
  const GAP = 1;


  // Calculate Snake Layout
  useEffect(() => {
    if (!room) return;
    
    const pieces = room.board || [];
    if (pieces.length === 0) {
       setZonePositions({ 
         left: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }, 
         right: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' } 
       });
       setLayoutPieces([]);
       setBoardSize({ width: 400, height: 400 });
       setScale(1);
       return;
    }
    
    const tempLayout: any[] = [];
    const PW = PIECE_WIDTH;
    const PH = PIECE_HEIGHT;
    const G = GAP;
    
    // Limits based on screen
    const maxRowWidth = Math.min(boardWidth * 0.85, 500); 

    let curX = 0;
    let curY = 0;
    let curDir = 1; // 1 = right, -1 = left
    
    let minX = 0, maxX = 0, minY = 0, maxY = 0;

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      const isDouble = piece.piece.left === piece.piece.right;
      
      // A largura visual na linha de jogo muda se for double (que fica de pé)
      const visualWidth = isDouble ? PH : PW;
      
      // Verifica se precisa virar (curva do snake)
      const predictedX = curX + (curDir * visualWidth);
      let isTurnPiece = false;
      if (i > 0 && ((curDir === 1 && predictedX > maxRowWidth/2) || (curDir === -1 && predictedX < -maxRowWidth/2))) {
        isTurnPiece = true;
      }

      let rotation = 0;
      if (isTurnPiece) {
        rotation = 90;
      } else {
        // Doubles sempre ficam a 90 graus da linha de jogo
        rotation = isDouble ? 90 : (curDir === 1 ? 0 : 180);
      }

      tempLayout.push({
        ...piece,
        x: curX,
        y: curY,
        rotation,
        isDouble,
        isTurnPiece
      });

      // Bounds
      minX = Math.min(minX, curX - PW);
      maxX = Math.max(maxX, curX + PW);
      minY = Math.min(minY, curY - PW);
      maxY = Math.max(maxY, curY + PW);

      // Calcular posição da PRÓXIMA peça
      if (isTurnPiece) {
        curY += PW + G;
        curDir *= -1;
      } else {
        // Distância entre centros depende do tipo da peça atual e da próxima
        const nextPiece = pieces[i+1];
        const nextIsDouble = nextPiece?.piece.left === nextPiece?.piece.right;
        
        // Espaçamento matemático perfeito: metade da largura atual + metade da próxima
        const currentHalf = (isDouble ? PH : PW) / 2;
        const nextHalf = (nextIsDouble ? PH : PW) / 2;
        const step = currentHalf + nextHalf + G;
        
        curX += curDir * step;
      }
    }
    
    const padding = 100;
    const lWidth = maxX - minX + padding * 2;
    const lHeight = maxY - minY + padding * 2;
    
    const finalLayout = tempLayout.map(item => ({
      ...item,
      style: {
        left: item.x - minX + padding,
        top: item.y - minY + padding,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
        zIndex: 10
      }
    }));

    // Zones
    const first = finalLayout[0];
    const last = finalLayout[finalLayout.length - 1];

    // Left zone (start of chain)
    const leftZ = {
      left: first.style.left - (first.isDouble ? PH : PW) - 10,
      top: first.style.top,
      transform: 'translate(-50%, -50%)'
    };

    // Right zone (end of chain)
    const lastMeta = tempLayout[tempLayout.length - 1];
    let rXOffset = 0, rYOffset = 0;
    
    if (lastMeta.isTurnPiece) {
      rYOffset = PW + 20;
    } else {
      const dir = lastMeta.rotation === 180 ? -1 : 1;
      rXOffset = (lastMeta.isDouble ? PH : PW) * dir + 15 * dir;
    }

    const rightZ = {
      left: last.style.left + rXOffset,
      top: last.style.top + rYOffset,
      transform: 'translate(-50%, -50%)'
    };

    setLayoutPieces(finalLayout);
    setZonePositions({ left: leftZ, right: rightZ });
    setBoardSize({ width: lWidth, height: lHeight });

    const availW = boardWidth - 40;
    const availH = window.innerHeight * 0.6;
    setScale(Math.min(1, availW / lWidth, availH / lHeight, 0.85));

  }, [room?.board, boardWidth]);


  const renderZone = (side: 'left' | 'right') => {
    const isLeft = side === 'left';
    const ref = isLeft ? leftZoneRef : rightZoneRef;
    
    return (
      <div 
        ref={ref}
        onClick={() => {
          if (selectedPiece && !isProcessing) {
            playPiece(selectedPiece, side);
            setSelectedPiece(null);
          }
        }}
        className={cn(
          "border-2 border-dashed rounded-xl flex-shrink-0 transition-all duration-300 cursor-pointer flex items-center justify-center z-20",
          (isDragging || selectedPiece) 
            ? "w-[90px] h-[50px] opacity-100 border-[#f0d0a0] bg-[#f0d0a0]/20 scale-110 animate-pulse shadow-[0_0_25px_rgba(240,208,160,0.6)]" 
            : "w-0 h-0 opacity-0 border-transparent overflow-hidden"
        )}
      >
         {(isDragging || selectedPiece) && (
           <div className="flex flex-col items-center gap-1">
             <div className="w-2 h-2 rounded-full bg-[#f0d0a0] animate-ping" />
             <span className="text-[8px] font-bold text-[#f0d0a0] uppercase tracking-tighter">Conectar</span>
           </div>
         )}
      </div>
    );
  };

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

    const interval = setInterval(async () => {
      const seconds = Math.max(0, Math.ceil((room.turnDeadline! - Date.now()) / 1000));
      setTimeLeft(seconds);

      if (seconds === 0 && room.players[room.currentTurnIndex].id === playerId) {
        // Time's up! Auto-play logic
        const player = room.players.find(p => p.id === playerId);
        if (player) {
           // Try to find a valid move
           const left = room.leftEnd;
           const right = room.rightEnd;
           const validPiece = player.hand.find(p => 
             !room.board || room.board.length === 0 || p.left === left || p.right === left || p.left === right || p.right === right
           );

           if (validPiece) {
             const side = (!room.board || room.board.length === 0 || validPiece.left === left || validPiece.right === left) ? 'left' : 'right';
             await playPiece(validPiece, side);
           } else {
             // Pass turn (force, since timeout)
             await passTurn(true);
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
      const difficulty = room.config.difficulty || 'medium';

      if (difficulty === 'easy') {
        // Random
        const randomIndex = Math.floor(Math.random() * validMoves.length);
        const move = validMoves[randomIndex];
        await playPiece(move.piece, move.side, true);
      } else if (difficulty === 'medium') {
        // Doubles first, then random
        const doubles = validMoves.filter(m => m.piece.left === m.piece.right);
        if (doubles.length > 0) {
           const randomIndex = Math.floor(Math.random() * doubles.length);
           const move = doubles[randomIndex];
           await playPiece(move.piece, move.side, true);
        } else {
           const randomIndex = Math.floor(Math.random() * validMoves.length);
           const move = validMoves[randomIndex];
           await playPiece(move.piece, move.side, true);
        }
      } else {
        // Hard (Current Logic: Doubles -> Highest Value)
        validMoves.sort((a, b) => {
          const isDoubleA = a.piece.left === a.piece.right;
          const isDoubleB = b.piece.left === b.piece.right;
          if (isDoubleA && !isDoubleB) return -1;
          if (!isDoubleA && isDoubleB) return 1;
          return (b.piece.left + b.piece.right) - (a.piece.left + a.piece.right);
        });
        const move = validMoves[0];
        await playPiece(move.piece, move.side, true);
      }
    } else {
      // No valid moves
      if (room.config.piecesPerPlayer === 3 && room.drawPile && room.drawPile.length > 0) {
        const success = await buyPiece(true); // Bypass processing for Bot
        if (!success) {
           // If buy failed (e.g. empty pile race condition), pass turn
           await passTurn(false, true); // Force=false, Bypass=true
        }
      } else {
        await passTurn(false, true); // Force=false, Bypass=true
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
        piecesPerPlayer: piecesConfig,
        difficulty: difficulty
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
        piecesPerPlayer: piecesConfig,
        difficulty: difficulty
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

  const buyPiece = async (bypassProcessing = false): Promise<boolean> => {
    if (!room || (isProcessing && !bypassProcessing)) return false;
    
    // Only allowed if piecesPerPlayer is 3
    if (room.config.piecesPerPlayer !== 3) {
      setError('Compra não permitida nesta modalidade!');
      return false;
    }

    // Optimistic check (allow bot or current player)
    const currentPlayer = room.players[room.currentTurnIndex];
    const isBotTurn = currentPlayer.isBot;
    
    // If it's human turn, check ID. If bot turn, allow execution (since we are the host)
    if (!isBotTurn && currentPlayer.id !== playerId) return false;
    
    if (!room.drawPile || room.drawPile.length === 0) {
      if (!isBotTurn) setError('Monte vazio!');
      return false;
    }

    setIsProcessing(true);

    try {
      const newDrawPile = [...room.drawPile];
      const piece = newDrawPile.pop(); // Take from top
      
      if (!piece) return false;

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
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const passTurn = async (forcePass: boolean = false, bypassProcessing = false) => {
    if (!room || (isProcessing && !bypassProcessing)) return;
    
    const currentPlayer = room.players[room.currentTurnIndex];
    const isBotTurn = currentPlayer.isBot;

    if (!isBotTurn && currentPlayer.id !== playerId) return;

    // Rule: must buy until you can play IF piecesPerPlayer is 3 and pile not empty
    // Unless forcePass is true (e.g. timeout)
    if (!forcePass && room.config.piecesPerPlayer === 3 && room.drawPile && room.drawPile.length > 0) {
      if (!isBotTurn) setError('Você deve comprar peças!');
      return;
    }

    setIsProcessing(true);

    try {
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const playPiece = async (piece: DominoPiece, side: 'left' | 'right', bypassProcessing = false) => {
    if (!room || (isProcessing && !bypassProcessing)) return;
    
    const currentPlayer = room.players[room.currentTurnIndex];
    const isBotTurn = currentPlayer.isBot;

    if (!isBotTurn && currentPlayer.id !== playerId) return;

    setIsProcessing(true);

    const playerIndex = room.currentTurnIndex;
    const player = room.players[playerIndex];
    
    // Find piece index in hand (handle both orientations in hand)
    const pieceIndex = player.hand.findIndex(p => 
      (p.left === piece.left && p.right === piece.right) || 
      (p.left === piece.right && p.right === piece.left)
    );

    if (pieceIndex === -1) {
      setIsProcessing(false);
      return;
    }

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
          setIsProcessing(false);
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
          setIsProcessing(false);
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

    try {
      await update(ref(database, `rooms/${room.id}`), updates);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
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
  const renderDots = (value: number, isSmall = false) => {
    const positions: Record<number, number[]> = {
      0: [],
      1: [4],
      2: [2, 6], 
      3: [2, 4, 6],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };

    const dotIndices = positions[value] || [];

    return (
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-[15%] gap-[1px]">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="flex items-center justify-center">
            {dotIndices.includes(i) && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                "rounded-full bg-slate-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_1px_rgba(0,0,0,0.3)]",
                isSmall ? "w-1.5 h-1.5" : "w-3 h-3 md:w-4 md:h-4"
              )} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPiece = (piece: DominoPiece, isSmall = false, orientation: 'vertical' | 'horizontal' = 'vertical') => {
    const isHorizontal = orientation === 'horizontal';
    
    let sizeClass = "";
    let inlineStyle = {};
    
    if (isSmall) {
      // Proporção 2:1 exata para as peças do tabuleiro
      inlineStyle = {
        width: 70,  
        height: 35
      };
    } else {
      sizeClass = isHorizontal
        ? "w-20 h-10 sm:w-24 sm:h-12 md:w-32 md:h-16"
        : "w-10 h-20 sm:w-12 sm:h-24 md:w-16 md:h-32";
    }

    return (
      <div 
        className={cn(
          "relative bg-[#fdfbf7] rounded-lg flex items-center justify-between select-none overflow-hidden transition-transform duration-300",
          "shadow-[2px_2px_0px_0px_#d1d5db,4px_4px_8px_0px_rgba(0,0,0,0.3)] hover:shadow-[3px_3px_0px_0px_#d1d5db,6px_6px_12px_0px_rgba(0,0,0,0.4)]",
          isHorizontal ? "flex-row" : "flex-col",
          sizeClass
        )}
        style={inlineStyle}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/5 pointer-events-none" />
        
        <div className="flex-1 w-full h-full flex items-center justify-center relative">
          {renderDots(piece.left, isSmall)}
        </div>
        
        <div className={cn(
          "bg-slate-300 shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)]", 
          isHorizontal ? "w-[2px] h-[70%]" : "w-[70%] h-[2px]"
        )} />
        
        <div className="flex-1 w-full h-full flex items-center justify-center relative">
          {renderDots(piece.right, isSmall)}
        </div>

        {/* Pin in the middle for double-sided look */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-slate-400 rounded-full shadow-inner opacity-40" />
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

  const isMyTurn = room?.players?.[room.currentTurnIndex]?.id === playerId;
  const hasValidMove = canPlay();
  const canBuy = room?.config?.piecesPerPlayer === 3 && (room?.drawPile?.length ?? 0) > 0;

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
                  
                  <div className="space-y-2">
                    <label className="text-xs text-green-300 font-bold uppercase">Dificuldade</label>
                    <div className="flex bg-black/30 rounded-xl p-1 border border-green-800">
                      {[
                        { label: 'Fácil', value: 'easy' },
                        { label: 'Médio', value: 'medium' },
                        { label: 'Difícil', value: 'hard' }
                      ].map(level => (
                        <button
                          key={level.value}
                          onClick={() => setDifficulty(level.value as any)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                            difficulty === level.value ? "bg-[#f0d0a0] text-black shadow-lg" : "text-green-400 hover:text-green-200"
                          )}
                        >
                          {level.label}
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
                    <span className="font-bold">{room.players?.length ?? 0} Jogadores</span>
                  </div>
                  
                  <div className="space-y-2">
                    {room.players.map((player) => (
                      <div key={player.id} className="bg-white/5 p-3 rounded-xl flex items-center justify-between border border-white/10">
                        <span className="font-bold text-white">{player.name}</span>
                        {player.id === playerId && <span className="text-xs bg-[#f0d0a0] text-black font-bold px-2 py-1 rounded">Você</span>}
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - (room.players?.length ?? 0)) }).map((_, i) => (
                      <div key={`empty-${i}`} className="border-2 border-dashed border-white/10 p-3 rounded-xl text-white/30 font-bold">
                        Aguardando...
                      </div>
                    ))}
                  </div>
                </div>

                {room.players?.[0]?.id === playerId && (
                  <button
                    onClick={startGame}
                    disabled={room.players.length < 2}
                    className="w-full mt-8 bg-[#f0d0a0] hover:bg-[#e0c090] disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none text-black font-bold py-4 rounded-xl shadow-[0px_4px_0px_0px_#b09060] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={20} />
                    Iniciar Jogo
                  </button>
                )}
                
                {room.players?.[0]?.id !== playerId && (
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
                  Turno de: <span className="font-bold text-[#f0d0a0] text-lg ml-1">{room.players?.[room.currentTurnIndex]?.name ?? '...'}</span>
                </div>
                <div className="text-xs text-white/50">
                  Monte: {room.drawPile?.length ?? 0}
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

                        {room.players?.[0]?.id === playerId ? (
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
              <div ref={boardRef} className="flex-1 m-2 flex items-center justify-center relative overflow-hidden rounded-3xl shadow-[inset_0_4px_20px_rgba(0,0,0,0.4)] bg-[#1a472a] border border-white/5 group">
                {/* Felt texture overlay */}
                <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-overlay"
                     style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }}></div>
                
                {/* Ambient light effect */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.1),transparent)] pointer-events-none"></div>

                {(!room.board || room.board.length === 0) ? (
                  <div 
                    ref={leftZoneRef}
                    onClick={() => {
                      if (selectedPiece) {
                        playPiece(selectedPiece, 'left');
                        setSelectedPiece(null);
                      }
                    }}
                    className={cn(
                      "w-56 h-36 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer z-10",
                      (isDragging || selectedPiece) ? "border-[#f0d0a0] bg-[#f0d0a0]/10 scale-110 shadow-[0_0_50px_rgba(240,208,160,0.3)]" : "border-white/10 bg-black/20 backdrop-blur-sm"
                    )}
                  >
                    <div className="w-14 h-14 rounded-full border-2 border-[#f0d0a0]/40 flex items-center justify-center mb-3 animate-pulse bg-black/20">
                      <PlusCircle className="text-[#f0d0a0]" size={28} />
                    </div>
                    <div className="text-[#f0d0a0] font-bold text-sm uppercase tracking-widest text-center px-6 drop-shadow-lg">
                      {(isDragging || selectedPiece) ? "Solte para Iniciar" : (isMyTurn ? "Comece o Jogo" : "Aguardando...")}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full overflow-hidden flex items-center justify-center">
                    {/* Scaled Board Container */}
                    <div 
                      className="relative transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] origin-center" 
                      style={{ 
                        width: boardSize.width, 
                        height: boardSize.height,
                        transform: `scale(${scale})`
                      }}
                    >
                       {layoutPieces.map((item, index) => {
                          const p = item.piece;
                          const id = `board-piece-${index}-${p.left}-${p.right}`;
                          return (
                            <motion.div
                              key={id}
                              layoutId={id}
                              initial={{ scale: 0, opacity: 0, rotate: item.rotation - 20 }}
                              animate={{ scale: 1, opacity: 1, rotate: item.rotation }}
                              className="absolute origin-center"
                              style={item.style}
                            >
                              {renderPiece(item.piece, true, 'horizontal')}
                            </motion.div>
                          );
                       })}
                       
                       {/* Drop Zones */}
                       <div className="absolute transition-all duration-300" style={zonePositions.left}>
                          {renderZone('left')}
                       </div>
                       <div className="absolute transition-all duration-300" style={zonePositions.right}>
                          {renderZone('right')}
                       </div>
                    </div>
                  </div>
                )}
                
                {/* Opponents Hands & Status - Glassmorphism UI */}
                <div className="absolute top-4 left-0 right-0 px-4 flex justify-between items-start pointer-events-none z-30">
                  {/* Left: Room Info */}
                  <div className="bg-black/60 px-4 py-2 rounded-2xl backdrop-blur-md pointer-events-auto border border-white/10 shadow-xl">
                    <div className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-0.5">Sala</div>
                    <div className="font-mono font-bold text-[#f0d0a0] text-sm tracking-tighter">{room.id}</div>
                  </div>

                  {/* Center: Opponents */}
                  <div className="flex gap-3 pointer-events-auto">
                    {(room.players ?? []).filter(p => p.id !== playerId).map(p => (
                      <div key={p.id} className={cn(
                        "flex flex-col items-center p-2.5 rounded-2xl transition-all duration-500 backdrop-blur-lg border shadow-lg",
                        room.players?.[room.currentTurnIndex]?.id === p.id 
                          ? "bg-[#f0d0a0]/30 scale-110 border-[#f0d0a0]/50 shadow-[0_0_20px_rgba(240,208,160,0.4)]" 
                          : "bg-black/40 border-white/5 opacity-80"
                      )}>
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border border-white/20 mb-1.5 shadow-inner relative">
                           <span className="text-xs font-black text-white">{p.name.substring(0, 2).toUpperCase()}</span>
                           {room.players?.[room.currentTurnIndex]?.id === p.id && (
                             <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse shadow-sm" />
                           )}
                        </div>
                        <div className="text-[10px] text-white font-bold tracking-wide max-w-[60px] truncate">{p.name}</div>
                        <div className="flex items-center gap-1 mt-1 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/5">
                          <div className="w-2 h-3 bg-[#f0d0a0] rounded-[1px] opacity-70"></div>
                          <span className="text-[11px] font-black text-[#f0d0a0]">{p.hand?.length || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right: Timer */}
                  <div className={cn(
                    "px-4 py-2 rounded-2xl backdrop-blur-md transition-all duration-300 pointer-events-auto border shadow-xl flex flex-col items-center min-w-[70px]",
                    timeLeft < 10 ? "bg-red-500/30 border-red-500/50 animate-pulse" : "bg-black/60 border-white/10"
                  )}>
                    <div className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-0.5">Tempo</div>
                    <div className={cn("font-mono font-black text-lg leading-none", timeLeft < 10 ? "text-red-400" : "text-white")}>
                      {timeLeft}
                    </div>
                  </div>
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

                <div className="flex overflow-x-auto no-scrollbar gap-2 pb-4 px-2 min-h-[110px] sm:min-h-[140px] items-center justify-start md:justify-center">
                  {(room.players ?? []).find(p => p.id === playerId)?.hand?.map((piece, i) => {
                    const id = `piece-${i}-${piece.left}-${piece.right}`;
                    const fitsLeft = piece.left === room.leftEnd || piece.right === room.leftEnd;
                    const fitsRight = piece.left === room.rightEnd || piece.right === room.rightEnd;
                    const canPlayThis = isMyTurn && ((room.board?.length ?? 0) === 0 || fitsLeft || fitsRight);

                    return (
                      <motion.div
                        key={id}
                        layoutId={id}
                        drag={isMyTurn}
                        dragSnapToOrigin
                        dragElastic={0.2}
                        dragMomentum={false}
                        onClick={() => {
                          if (!isMyTurn || isProcessing) return;

                          const leftEnd = room.leftEnd;
                          const rightEnd = room.rightEnd;
                          
                          const fitsLeft = piece.left === leftEnd || piece.right === leftEnd;
                          const fitsRight = piece.left === rightEnd || piece.right === rightEnd;
                          
                          // Se o board está vazio, qualquer peça cabe (primeira jogada)
                          if (!room.board || room.board.length === 0) {
                            playPiece(piece, 'left');
                            return;
                          }

                          if (fitsLeft && !fitsRight) {
                            playPiece(piece, 'left');
                          } else if (fitsRight && !fitsLeft) {
                            playPiece(piece, 'right');
                          } else if (fitsLeft && fitsRight) {
                            // Fits both! Require selection and zone tap.
                            if (selectedPiece === piece) {
                              setSelectedPiece(null);
                            } else {
                              setSelectedPiece(piece);
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
                  ); })}
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
