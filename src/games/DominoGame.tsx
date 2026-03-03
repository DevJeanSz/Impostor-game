import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Copy, Users, Play, GripHorizontal, Share2 } from 'lucide-react';
import { cn } from '../lib/utils';

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
}

export function DominoGame({ onBack }: DominoGameProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [view, setView] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [piecesConfig, setPiecesConfig] = useState(6); // Default to 6 as requested
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomIdInput(roomParam);
    }

    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('room_created', (id) => {
      // Room created, waiting for update_room to set state
    });

    newSocket.on('update_room', (updatedRoom) => {
      setRoom(updatedRoom);
      setView('lobby');
    });

    newSocket.on('game_started', (updatedRoom) => {
      setRoom(updatedRoom);
      setView('game');
    });

    newSocket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const createRoom = () => {
    if (!playerName) {
      setError('Digite seu nome');
      return;
    }
    socket?.emit('create_room', { name: playerName, piecesPerPlayer: piecesConfig });
  };

  const joinRoom = () => {
    if (!playerName || !roomIdInput) {
      setError('Preencha nome e código da sala');
      return;
    }
    socket?.emit('join_room', { roomId: roomIdInput.toUpperCase(), name: playerName });
  };

  const startGame = () => {
    if (room) {
      socket?.emit('start_game', room.id);
    }
  };

  const copyRoomCode = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
      // Could add toast here
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

  // Render Helpers
  const renderPiece = (piece: DominoPiece, isSmall = false) => (
    <div className={cn(
      "bg-white rounded-md border border-slate-300 flex flex-col items-center justify-between shadow-sm select-none",
      isSmall ? "w-6 h-12 p-0.5" : "w-10 h-20 p-1"
    )}>
      <div className="flex-1 w-full flex items-center justify-center">
        {renderDots(piece.left, isSmall)}
      </div>
      <div className="w-full h-px bg-slate-300"></div>
      <div className="flex-1 w-full flex items-center justify-center">
        {renderDots(piece.right, isSmall)}
      </div>
    </div>
  );

  const renderDots = (num: number, isSmall: boolean) => {
    // Simplified dot rendering logic
    return <span className={cn("font-bold text-slate-900", isSmall ? "text-xs" : "text-lg")}>{num}</span>;
  };

  return (
    <div className="h-full flex flex-col relative bg-green-900 text-slate-50">
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-green-950/50 backdrop-blur-sm">
        <button 
          onClick={onBack}
          className="p-2 text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold tracking-wider flex items-center gap-2">
          <GripHorizontal /> DOMINÓ ONLINE
        </h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 pt-20">
        <AnimatePresence mode="wait">
          {view === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md space-y-6"
            >
              <div className="bg-green-800/50 p-6 rounded-2xl border border-green-700/50 space-y-4">
                <h2 className="text-2xl font-bold text-center mb-6">Novo Jogo</h2>
                
                <div className="space-y-2">
                  <label className="text-sm text-green-200 font-bold uppercase">Seu Nome</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Como quer ser chamado?"
                    className="w-full bg-green-950/50 border border-green-700 rounded-xl p-4 text-white placeholder-green-700 focus:outline-none focus:border-green-400 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs text-green-300 font-bold uppercase">Pedras por Jogador</label>
                    <div className="flex bg-green-950/50 rounded-xl p-1 border border-green-700">
                      {[3, 6, 7].map(num => (
                        <button
                          key={num}
                          onClick={() => setPiecesConfig(num)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                            piecesConfig === num ? "bg-green-600 text-white shadow-lg" : "text-green-400 hover:text-green-200"
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
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 mt-4"
                >
                  Criar Sala
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-green-700"></div>
                  <span className="flex-shrink-0 mx-4 text-green-300 text-xs uppercase">Ou entre em uma</span>
                  <div className="flex-grow border-t border-green-700"></div>
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    placeholder="Código da Sala"
                    className="w-full bg-green-950/50 border border-green-700 rounded-xl p-4 text-white placeholder-green-700 focus:outline-none focus:border-green-400 transition-colors uppercase text-center"
                  />
                  <button
                    onClick={joinRoom}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all active:scale-95"
                  >
                    Entrar
                  </button>
                </div>
              </div>
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/90 text-white p-3 rounded-lg text-center text-sm font-bold"
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
              <div className="bg-green-800/50 p-8 rounded-3xl border border-green-700/50">
                <h2 className="text-slate-300 text-sm uppercase tracking-widest mb-4">Código da Sala</h2>
                
                <div className="flex flex-col items-center gap-4 mb-8">
                  <div 
                    onClick={copyRoomCode}
                    className="bg-green-950/50 border-2 border-green-500/30 rounded-2xl px-8 py-4 flex items-center gap-4 cursor-pointer hover:bg-green-900/50 transition-colors group"
                  >
                    <span className="text-5xl font-mono font-bold text-white tracking-widest group-hover:scale-105 transition-transform">
                      {room.id}
                    </span>
                    <Copy size={24} className="text-green-400 group-hover:text-white transition-colors" />
                  </div>

                  <button
                    onClick={shareRoom}
                    className="flex items-center gap-2 text-green-300 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider bg-green-900/30 px-4 py-2 rounded-full hover:bg-green-800/50"
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
                      <div key={player.id} className="bg-green-900/50 p-3 rounded-xl flex items-center justify-between border border-green-700/30">
                        <span className="font-bold">{player.name}</span>
                        {player.id === socket?.id && <span className="text-xs bg-green-600 px-2 py-1 rounded text-white">Você</span>}
                      </div>
                    ))}
                    {Array.from({ length: 4 - room.players.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="border-2 border-dashed border-green-800 p-3 rounded-xl text-green-800 font-bold">
                        Aguardando...
                      </div>
                    ))}
                  </div>
                </div>

                {room.players[0].id === socket?.id && (
                  <button
                    onClick={startGame}
                    disabled={room.players.length < 2}
                    className="w-full mt-8 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Play size={20} />
                    Iniciar Jogo
                  </button>
                )}
                
                {room.players[0].id !== socket?.id && (
                  <p className="mt-8 text-green-300 animate-pulse">Aguardando líder iniciar...</p>
                )}
              </div>
            </motion.div>
          )}

          {view === 'game' && room && (
            <div className="w-full h-full flex flex-col">
              {/* Game Info */}
              <div className="flex justify-between items-center px-4 py-2 bg-green-900/50">
                <div className="text-sm text-green-300">
                  Turno de: <span className="font-bold text-white">{room.players[room.currentTurnIndex].name}</span>
                </div>
                <div className="text-xs text-green-400">
                  Sala: {room.id}
                </div>
              </div>

              {/* Game Board Area */}
              <div className="flex-1 bg-green-800/30 rounded-xl m-2 border border-green-700/30 flex items-center justify-center relative overflow-hidden p-8">
                {room.board.length === 0 ? (
                  <div className="text-green-500/30 font-bold text-2xl uppercase tracking-widest">
                    Sua vez de começar!
                  </div>
                ) : (
                  <div className="flex items-center gap-1 flex-wrap justify-center max-w-full">
                    {room.board.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0"
                      >
                        {renderPiece(item.piece, true)}
                      </motion.div>
                    ))}
                  </div>
                )}
                
                {/* Opponents Hands (Simplified visualization) */}
                <div className="absolute top-2 right-2 flex gap-2">
                  {room.players.filter(p => p.id !== socket?.id).map(p => (
                    <div key={p.id} className="bg-green-900/80 p-2 rounded-lg border border-green-700 text-xs text-center">
                      <div className="font-bold text-green-300">{p.name}</div>
                      <div className="text-white">{p.hand.length} peças</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Player Hand */}
              <div className="h-40 bg-green-900/90 border-t border-green-800 p-4 pb-8">
                <p className="text-xs text-green-400 uppercase font-bold mb-2 text-center">
                  {room.players[room.currentTurnIndex].id === socket?.id ? "Sua Vez!" : "Aguarde..."}
                </p>
                <div className="flex justify-center gap-2 overflow-x-auto pb-2 px-4">
                  {room.players.find(p => p.id === socket?.id)?.hand.map((piece, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ y: -10 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (room.players[room.currentTurnIndex].id !== socket?.id) return;
                        
                        // Simple auto-play logic for now (tries left, then right)
                        // In a real game, if both match, user must choose.
                        // For MVP, we'll just emit and let server validate.
                        // Ideally, we should show "Left" or "Right" buttons if ambiguous.
                        
                        // Try left
                        socket?.emit('play_piece', { roomId: room.id, piece, side: 'left' });
                        // Try right (server will ignore if left worked, but this is racey. Better to be explicit)
                        // For this MVP, let's just send 'left' first. If it fails, user clicks again? 
                        // No, let's improve this.
                        
                        // Better UX: Check locally if it matches left or right
                        const leftEnd = room.leftEnd;
                        const rightEnd = room.rightEnd;
                        
                        if (room.board.length === 0) {
                           socket?.emit('play_piece', { roomId: room.id, piece, side: 'left' }); // Side doesn't matter for first piece
                           return;
                        }

                        const matchesLeft = piece.left === leftEnd || piece.right === leftEnd;
                        const matchesRight = piece.left === rightEnd || piece.right === rightEnd;

                        if (matchesLeft && matchesRight && leftEnd !== rightEnd) {
                          // Ambiguous! Ask user. For now, default to left.
                          // TODO: Add UI for side selection
                          const side = confirm("Jogar na esquerda?") ? 'left' : 'right';
                           socket?.emit('play_piece', { roomId: room.id, piece, side });
                        } else if (matchesLeft) {
                           socket?.emit('play_piece', { roomId: room.id, piece, side: 'left' });
                        } else if (matchesRight) {
                           socket?.emit('play_piece', { roomId: room.id, piece, side: 'right' });
                        } else {
                          // Invalid move feedback
                          setError("Essa peça não encaixa!");
                          setTimeout(() => setError(''), 2000);
                        }
                      }}
                      className={cn(
                        "cursor-pointer transition-opacity",
                        room.players[room.currentTurnIndex].id !== socket?.id && "opacity-50 cursor-not-allowed"
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
