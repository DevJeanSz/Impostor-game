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
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 justify-center">
      <div className="w-full flex flex-col items-center space-y-8 overflow-y-auto max-h-full py-4">
        <div className="text-center space-y-2 shrink-0">
          <span className="inline-block px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-mono uppercase tracking-widest">
            Jogador {playerIndex + 1} de {totalPlayers}
          </span>
          <h2 className="text-3xl font-bold text-white truncate max-w-full">
            {currentPlayer}
          </h2>
        </div>

        <div className="w-full flex justify-center shrink-0">
          <AnimatePresence mode="wait">
            {!isRevealed ? (
              <motion.div
                key="hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-xs"
              >
                <button
                  onClick={() => setIsRevealed(true)}
                  className="w-full aspect-[3/4] bg-slate-800 rounded-3xl border-2 border-slate-700 flex flex-col items-center justify-center gap-6 group hover:border-indigo-500/50 transition-colors p-6"
                >
                  <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center group-hover:bg-indigo-900/20 transition-colors shrink-0">
                    <Eye size={32} className="text-indigo-400" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-slate-200">Verificar Função</h3>
                    <p className="text-sm text-slate-500">
                      Certifique-se de que apenas você está olhando para a tela.
                    </p>
                  </div>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="revealed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-xs"
              >
                <div className={cn(
                  "w-full aspect-[3/4] rounded-3xl border-2 flex flex-col items-center justify-center gap-4 p-6 text-center",
                  isImpostor 
                    ? "bg-red-950/30 border-red-500/50" 
                    : "bg-indigo-950/30 border-indigo-500/50"
                )}>
                  <div className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center mb-2 shrink-0",
                    isImpostor ? "bg-red-500/20" : "bg-indigo-500/20"
                  )}>
                    {isImpostor ? (
                      <EyeOff size={32} className="text-red-400" />
                    ) : (
                      <Eye size={32} className="text-indigo-400" />
                    )}
                  </div>
                  
                  <div className="space-y-4 flex-1 flex flex-col justify-center w-full">
                    <h3 className={cn(
                      "text-xl font-bold uppercase tracking-widest",
                      isImpostor ? "text-red-400" : "text-indigo-400"
                    )}>
                      {isImpostor ? "IMPOSTOR" : "CIDADÃO"}
                    </h3>
                    
                    <div className="py-4 border-t border-white/10 border-b">
                      <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Sua Palavra Secreta</p>
                      <p className={cn(
                        "text-2xl font-bold break-words",
                        isImpostor ? "text-slate-500" : "text-white"
                      )}>
                        {isImpostor ? "???" : secretWord}
                      </p>
                    </div>

                    {isImpostor && (
                      <p className="text-xs text-red-300/80">
                        Engane os outros!
                      </p>
                    )}
                  </div>

                  <button
                    onClick={onNext}
                    className="mt-auto w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <span>Entendi</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
