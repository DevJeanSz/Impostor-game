import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { RotateCcw, User } from 'lucide-react';

interface RevealScreenProps {
  impostorName: string;
  secretWord: string;
  onPlayAgain: () => void;
}

export function RevealScreen({ impostorName, secretWord, onPlayAgain }: RevealScreenProps) {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ef4444', '#f97316'] // Red/Orange for impostor reveal
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ef4444', '#f97316']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 justify-center">
      <div className="w-full flex flex-col items-center space-y-8 overflow-y-auto max-h-full py-4 text-center">
        <div className="space-y-2 shrink-0">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-widest">
            O Impostor era
          </h2>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-red-500 blur-3xl opacity-20 rounded-full" />
            <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-900/50 mb-6">
              <User size={64} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 break-words">{impostorName}</h1>
          </motion.div>
        </div>

        <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 w-full shrink-0">
          <p className="text-sm text-slate-400 mb-2 uppercase tracking-wider">A Palavra Secreta</p>
          <p className="text-3xl font-bold text-indigo-400 break-words">{secretWord}</p>
        </div>

        <div className="w-full pt-4 shrink-0">
          <button
            onClick={onPlayAgain}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw size={20} />
            Jogar Novamente
          </button>
        </div>
      </div>
    </div>
  );
}
