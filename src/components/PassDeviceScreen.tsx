import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface PassDeviceScreenProps {
  currentPlayer: string;
  isImpostor: boolean;
  secretWord: string;
  onNext: () => void;
  playerIndex: number;
  totalPlayers: number;
}

export function PassDeviceScreen({
  currentPlayer,
  isImpostor,
  secretWord,
  onNext,
  playerIndex,
  totalPlayers,
}: PassDeviceScreenProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);

  const startHolding = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); // Prevent default touch actions
    setIsHolding(true);
    setHasRevealed(true);
  };

  const stopHolding = () => {
    setIsHolding(false);
  };

  return (
    <div className="flex flex-col h-full w-full items-center justify-center p-6 select-none">
      <div className="w-full max-w-md flex flex-col items-center space-y-8">
        <div className="text-center space-y-2 shrink-0">
          <span className="inline-block px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-mono uppercase tracking-widest border border-slate-700">
            Jogador {playerIndex + 1} de {totalPlayers}
          </span>
          <h2 className="text-3xl font-bold text-white truncate max-w-full drop-shadow-md">
            {currentPlayer}
          </h2>
        </div>

        <div className="w-full flex flex-col items-center gap-6 shrink-0 relative">
          <motion.div
            className="w-full max-w-xs relative z-10"
            whileTap={{ scale: 0.98 }}
          >
            <div
              onPointerDown={startHolding}
              onPointerUp={stopHolding}
              onPointerLeave={stopHolding}
              onContextMenu={(e) => e.preventDefault()}
              className={cn(
                "w-full aspect-[3/4] rounded-3xl border-2 flex flex-col items-center justify-center gap-4 p-6 text-center shadow-2xl transition-all duration-200 cursor-pointer touch-none",
                isHolding
                  ? (isImpostor ? "bg-red-950/90 border-red-500" : "bg-indigo-950/90 border-indigo-500")
                  : "bg-slate-800 border-slate-600 hover:border-slate-500"
              )}
            >
              <AnimatePresence mode="wait">
                {!isHolding ? (
                  <motion.div
                    key="hidden"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center gap-6"
                  >
                    <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center shadow-inner">
                      <Eye size={40} className="text-slate-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-200">Segure para Revelar</h3>
                      <p className="text-sm text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                        Mantenha pressionado para ver sua função secreta
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.1 }}
                    className="flex flex-col items-center gap-4 w-full"
                  >
                    <div className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center mb-2 shrink-0 shadow-lg",
                      isImpostor ? "bg-red-500/20" : "bg-indigo-500/20"
                    )}>
                      {isImpostor ? (
                        <EyeOff size={32} className="text-red-400" />
                      ) : (
                        <Eye size={32} className="text-indigo-400" />
                      )}
                    </div>
                    
                    <div className="space-y-4 flex-1 flex flex-col justify-center w-full">
                      {isImpostor && (
                        <h3 className="text-xl font-bold uppercase tracking-widest text-red-400 animate-pulse">
                          IMPOSTOR
                        </h3>
                      )}
                      
                      <div className="py-6 border-t border-white/10 border-b bg-black/20 rounded-xl my-2 backdrop-blur-sm">
                        <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-bold">Sua Palavra</p>
                        <p className={cn(
                          "text-3xl sm:text-4xl font-black break-words tracking-tight",
                          isImpostor 
                            ? "text-red-500" 
                            : "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        )}>
                          {isImpostor ? "???" : secretWord}
                        </p>
                      </div>

                      {isImpostor && (
                        <p className="text-xs text-red-300/80 font-medium">
                          Engane a todos!
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Next Button - Only appears after revealing at least once */}
          <div className="h-14 w-full max-w-xs flex items-center justify-center">
            <AnimatePresence>
              {hasRevealed && !isHolding && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={onNext}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                >
                  <span>Próximo Jogador</span>
                  <ArrowRight size={20} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
