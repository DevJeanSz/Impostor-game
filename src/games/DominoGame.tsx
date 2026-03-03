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
}

interface GameRoom {
  id: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  config: {
    piecesPerPlayer: number;
  };
  board: { piece: DominoPiece; ownerId: string; rotation?: number }[];
  drawPile: DominoPiece[];
  currentTurnIndex: number;
  leftEnd: number | null;
  rightEnd: number | null;
  winner?: Player;
  lastAction?: string;
  consecutivePasses: number;
}

export function DominoGame({ onBack }: DominoGameProps) {
  const [view, setView] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('domino_player_name') || '');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [piecesConfig, setPiecesConfig] = useState(6);
  const [error, setError] = useState('');
  const [playerId, setPlayerId] = useState(() => {
    const stored = localStorage.getItem('domino_player_id');
    if (stored) return stored;
    const newId = Math.random().toString(36).substr(2, 9);
    localStorage.setItem('domino_player_id', newId);
    return newId;
  });

  useEffect(() => {
    if (playerName) {
      localStorage.setItem('domino_player_name', playerName);
    }
  }, [playerName]);

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

  const generateRoomId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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

    // Optimistic check
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1 || room.currentTurnIndex !== playerIndex) return;
    
    if (!room.drawPile || room.drawPile.length === 0) {
      setError('Monte vazio!');
      return;
    }

    const newDrawPile = [...room.drawPile];
    const piece = newDrawPile.pop(); // Take from top
    
    if (!piece) return;

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
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1 || room.currentTurnIndex !== playerIndex) return;

    // Rule: must buy until you can play IF piecesPerPlayer is 3 and pile not empty
    if (room.config.piecesPerPlayer === 3 && room.drawPile && room.drawPile.length > 0) {
      setError('Você deve comprar peças!');
      return;
    }

    const nextTurn = (room.currentTurnIndex + 1) % room.players.length;
    const newConsecutivePasses = (room.consecutivePasses || 0) + 1;
    
    let updates: any = {
      currentTurnIndex: nextTurn,
      lastAction: `${room.players[playerIndex].name} passou a vez.`,
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
    
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1 || room.currentTurnIndex !== playerIndex) return;

    const player = room.players[playerIndex];
    const pieceIndex = player.hand.findIndex(p => 
      (p.left === piece.left && p.right === piece.right) || 
      (p.left === piece.right && p.right === piece.left)
    );

    if (pieceIndex === -1) return;

    let playedPiece = { ...player.hand[pieceIndex] };
    let newBoard = [...(room.board || [])];
    let newLeftEnd = room.leftEnd;
    let newRightEnd = room.rightEnd;
    let rotation = 0;

    if (newBoard.length === 0) {
      // First piece
      newBoard.push({ piece: playedPiece, ownerId: player.id, rotation: playedPiece.left === playedPiece.right ? 90 : 0 });
      newLeftEnd = playedPiece.left;
      newRightEnd = playedPiece.right;
    } else {
      if (side === 'left') {
        if (playedPiece.right === newLeftEnd) {
          // matches normally
        } else if (playedPiece.left === newLeftEnd) {
          playedPiece = { left: playedPiece.right, right: playedPiece.left };
        } else {
          setError('Jogada inválida!');
          setTimeout(() => setError(''), 2000);
          return;
        }
        
        // Determine rotation for visual flow
        const isDouble = playedPiece.left === playedPiece.right;
        rotation = isDouble ? 90 : 0; // Simplified rotation logic
        
        newBoard.unshift({ piece: playedPiece, ownerId: player.id, rotation });
        newLeftEnd = playedPiece.left;
      } else {
        if (playedPiece.left === newRightEnd) {
          // matches normally
        } else if (playedPiece.right === newRightEnd) {
          playedPiece = { left: playedPiece.right, right: playedPiece.left };
        } else {
          setError('Jogada inválida!');
          setTimeout(() => setError(''), 2000);
          return;
        }

        const isDouble = playedPiece.left === playedPiece.right;
        rotation = isDouble ? 90 : 0;

        newBoard.push({ piece: playedPiece, ownerId: player.id, rotation });
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
      consecutivePasses: 0 // Reset pass counter on successful play
    };

    if (newHand.length === 0) {
      updates.status = 'finished';
      updates.winner = player;
      updates.lastAction = `${player.name} venceu a partida!`;
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
                isSmall ? "w-1 h-1" : "w-1.5 h-1.5"
              )} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPiece = (piece: DominoPiece, isSmall = false, rotation = 0) => (
    <div 
      className={cn(
        "relative bg-white rounded flex flex-col items-center justify-between select-none overflow-hidden border border-slate-400",
        isSmall ? "w-6 h-12" : "w-12 h-24"
      )}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="flex-1 w-full flex items-center justify-center">
        {renderDots(piece.left, isSmall)}
      </div>
      <div className="w-full h-[1px] bg-slate-400"></div>
      <div className="flex-1 w-full flex items-center justify-center">
        {renderDots(piece.right, isSmall)}
      </div>
    </div>
  );

  // Check if current player has any valid moves
  const canPlay = () => {
    if (!room || !room.board || room.board.length === 0) return true; // Can always play first piece if it's their turn (logic handled elsewhere)
    
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    const left = room.leftEnd;
    const right = room.rightEnd;

    return player.hand.some(p => 
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

              {/* Game Board Area */}
              <div className="flex-1 rounded-xl m-2 flex items-center justify-center relative overflow-hidden p-8 shadow-inner bg-[#11301c]">
                {(!room.board || room.board.length === 0) ? (
                  <div className="text-white/20 font-bold text-2xl uppercase tracking-widest text-center">
                    {isMyTurn ? "Sua vez de começar!" : "Aguardando início..."}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 flex-wrap justify-center max-w-full overflow-auto p-4">
                    {room.board.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0"
                      >
                        {renderPiece(item.piece, true, item.rotation)}
                      </motion.div>
                    ))}
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
              <div className="bg-black/80 border-t border-[#f0d0a0]/30 p-4 pb-8 backdrop-blur-md">
                <div className="flex justify-between items-center mb-4 px-2">
                  <p className="text-xs text-[#f0d0a0] uppercase font-bold">
                    {isMyTurn ? "Sua Vez!" : "Aguarde..."}
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

                <div className="flex justify-center gap-3 overflow-x-auto pb-4 px-4 min-h-[90px]">
                  {room.players.find(p => p.id === playerId)?.hand?.map((piece, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ y: -15, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (!isMyTurn) return;
                        
                        const leftEnd = room.leftEnd;
                        const rightEnd = room.rightEnd;
                        
                        if (!room.board || room.board.length === 0) {
                           playPiece(piece, 'left');
                           return;
                        }

                        const matchesLeft = piece.left === leftEnd || piece.right === leftEnd;
                        const matchesRight = piece.left === rightEnd || piece.right === rightEnd;

                        if (matchesLeft && matchesRight && leftEnd !== rightEnd) {
                          const side = confirm("Jogar na esquerda?") ? 'left' : 'right';
                          playPiece(piece, side);
                        } else if (matchesLeft) {
                           playPiece(piece, 'left');
                        } else if (matchesRight) {
                           playPiece(piece, 'right');
                        } else {
                          setError("Essa peça não encaixa!");
                          setTimeout(() => setError(''), 2000);
                        }
                      }}
                      className={cn(
                        "cursor-pointer transition-all relative",
                        !isMyTurn && "opacity-50 cursor-not-allowed grayscale"
                      )}
                    >
                      {renderPiece(piece)}
                    </motion.button>
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
