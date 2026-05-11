import React, { useState } from 'react';
import { SetupScreen } from '../components/SetupScreen';
import { TimerScreen } from '../components/TimerScreen';
import { CATEGORIES } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, User, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';

type GameState = 'setup' | 'passing' | 'timer' | 'reveal';

interface PlayerCharacter {
  name: string;
  character: string;
}

interface WhoAmIGameProps {
  onBack: () => void;
}

export function WhoAmIGame({ onBack }: WhoAmIGameProps) {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [players, setPlayers] = useState<PlayerCharacter[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [category, setCategory] = useState('');

  const startGame = (playerNames: string[], _impostorCount: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
    // Select random category
    const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    setCategory(randomCategory.name);
    
    // Select unique words for each player
    const shuffledWords = [...randomCategory.words].sort(() => Math.random() - 0.5);
    
    const assignedPlayers = playerNames.map((name, index) => ({
      name,
      character: shuffledWords[index % shuffledWords.length]
    }));

    setPlayers(assignedPlayers);
    setCurrentPlayerIndex(0);
    setGameState('passing');
    setShowContent(false);
  };

  const handleNextPlayer = () => {
    setShowContent(false);
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
    } else {
      setGameState('timer');
    }
  };

  return (
    <div className="h-full relative bg-slate-900 text-white overflow-hidden">
      {gameState === 'setup' && (
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 z-10 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
      )}

      <AnimatePresence mode="wait">
        {gameState === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-full"
          >
            <div className="h-full flex flex-col p-6">
               <div className="mt-12 mb-8 text-center">
                 <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Quem Sou Eu?</h2>
                 <p className="text-slate-400 text-sm">Descubra quem você é fazendo perguntas aos seus amigos!</p>
               </div>
               <SetupScreen onStartGame={startGame} />
            </div>
          </motion.div>
        )}

        {gameState === 'passing' && (
          <motion.div
            key={`passing-${currentPlayerIndex}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="h-full flex flex-col items-center justify-center p-6 text-center"
          >
            {!showContent ? (
              <div className="space-y-8 w-full max-w-sm">
                <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                  <User size={48} className="text-white" />
                </div>
                <div>
                  <h3 className="text-slate-400 uppercase tracking-widest text-sm font-bold mb-2">Vez de:</h3>
                  <h2 className="text-5xl font-black text-white">{players[currentPlayerIndex].name}</h2>
                </div>
                <p className="text-slate-400 text-sm px-8">
                  Pegue o dispositivo. Você verá os personagens de todos os outros jogadores, exceto o seu!
                </p>
                <button
                  onClick={() => setShowContent(true)}
                  className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-xl"
                >
                  <Eye size={24} />
                  VER PERSONAGENS
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col pt-12">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Personagens dos Outros</h2>
                  <p className="text-blue-400 font-bold text-sm">Categoria: {category}</p>
                </div>
                
                <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar px-2">
                  {players.map((p, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "p-4 rounded-2xl flex items-center justify-between border transition-all",
                        idx === currentPlayerIndex 
                          ? "bg-slate-800/50 border-slate-700 opacity-50" 
                          : "bg-white/5 border-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                          idx === currentPlayerIndex ? "bg-slate-700 text-slate-500" : "bg-blue-600 text-white"
                        )}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <div className="text-xs text-slate-500 font-bold uppercase">{p.name}</div>
                          <div className="text-lg font-bold">
                            {idx === currentPlayerIndex ? "???" : p.character}
                          </div>
                        </div>
                      </div>
                      {idx === currentPlayerIndex && <EyeOff size={20} className="text-slate-600" />}
                    </div>
                  ))}
                </div>

                <div className="p-6">
                  <button
                    onClick={handleNextPlayer}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95"
                  >
                    {currentPlayerIndex === players.length - 1 ? "INICIAR JOGO" : "PRÓXIMO JOGADOR"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {gameState === 'timer' && (
          <motion.div
            key="timer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full"
          >
            <TimerScreen 
              onFinish={() => setGameState('reveal')}
              startingPlayer={players[Math.floor(Math.random() * players.length)].name}
            />
            {/* Visual Reminder for players */}
            <div className="absolute bottom-32 left-0 right-0 px-6 pointer-events-none">
                <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Lembrete</p>
                    <p className="text-xs text-slate-300">Faça perguntas que possam ser respondidas com "Sim" ou "Não"!</p>
                </div>
            </div>
          </motion.div>
        )}

        {gameState === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col p-6"
          >
            <div className="mt-12 mb-8 text-center">
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Revelação</h2>
              <p className="text-slate-400">Aqui estão os personagens de todos!</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
               {players.map((p, idx) => (
                 <motion.div 
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: idx * 0.1 }}
                   key={idx}
                   className="bg-white/5 border border-white/10 p-5 rounded-3xl flex items-center gap-4"
                 >
                   <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-black">
                     {p.name.charAt(0).toUpperCase()}
                   </div>
                   <div>
                     <div className="text-xs text-slate-500 font-black uppercase tracking-widest">{p.name}</div>
                     <div className="text-2xl font-black text-[#f0d0a0]">{p.character}</div>
                   </div>
                 </motion.div>
               ))}
            </div>

            <button
              onClick={() => setGameState('setup')}
              className="w-full bg-white text-black font-black py-4 rounded-2xl mt-6 shadow-xl active:scale-95 transition-transform"
            >
              JOGAR NOVAMENTE
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
