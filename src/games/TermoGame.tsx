import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RotateCcw, Delete, CornerDownLeft, Trophy, XCircle, HelpCircle, X, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { TERMO_WORDS } from '../data/termoWords';

interface TermoGameProps {
  onBack: () => void;
}

type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

interface Cell {
  letter: string;
  status: LetterStatus;
  displayLetter?: string;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'BACKSPACE'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'ENTER']
];

const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

export function TermoGame({ onBack }: TermoGameProps) {
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<Cell[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [message, setMessage] = useState('');
  const [shakeRow, setShakeRow] = useState(false);
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const hasSeenHelp = localStorage.getItem('cataletras_help_seen');
    if (!hasSeenHelp) {
      setShowHelp(true);
      localStorage.setItem('cataletras_help_seen', 'true');
    }
    startNewGame();
  }, []);

  const startNewGame = () => {
    const randomWord = TERMO_WORDS[Math.floor(Math.random() * TERMO_WORDS.length)].toUpperCase();
    setTargetWord(randomWord);
    setGuesses(Array(6).fill(null).map(() => Array(5).fill({ letter: '', status: 'empty' })));
    setCurrentGuess('');
    setGameState('playing');
    setMessage('');
    setRevealingRow(null);
  };

  const handleKeyPress = (key: string) => {
    if (gameState !== 'playing' || revealingRow !== null) return;
    if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (key === 'ENTER') {
      submitGuess();
    } else if (currentGuess.length < 5 && /^[A-Z]$/.test(key)) {
      setCurrentGuess(prev => prev + key);
    }
  };

  const submitGuess = () => {
    if (currentGuess.length !== 5) {
      showMessage('Palavra curta demais');
      triggerShake();
      return;
    }

    const normalizedTarget = normalize(targetWord);
    const normalizedGuess = normalize(currentGuess);

    if (!TERMO_WORDS.map(w => normalize(w)).includes(normalizedGuess)) {
      showMessage('Essa palavra não existe');
      triggerShake();
      return;
    }

    const currentRowIndex = guesses.findIndex(row => row[0].status === 'empty');
    if (currentRowIndex === -1) return;

    setRevealingRow(currentRowIndex);
    
    const newGuesses = [...guesses];
    const newRow: Cell[] = [];
    const targetLetters = normalizedTarget.split('');
    const guessLetters = normalizedGuess.split('');
    const originalTargetLetters = targetWord.split('');

    guessLetters.forEach((letter, i) => {
      if (letter === targetLetters[i]) {
        newRow[i] = { letter, status: 'correct', displayLetter: originalTargetLetters[i] };
        targetLetters[i] = ''; 
      } else {
        newRow[i] = { letter, status: 'empty' }; 
      }
    });

    guessLetters.forEach((letter, i) => {
      if (newRow[i].status !== 'correct') {
        const targetIndex = targetLetters.indexOf(letter);
        if (targetIndex !== -1) {
          newRow[i] = { letter, status: 'present', displayLetter: originalTargetLetters[guessLetters.indexOf(letter, i)] };
          targetLetters[targetIndex] = ''; 
        } else {
          newRow[i] = { letter, status: 'absent' };
        }
      }
    });

    setTimeout(() => {
      newGuesses[currentRowIndex] = newRow;
      setGuesses(newGuesses);
      setCurrentGuess('');
      setRevealingRow(null);

      if (normalizedGuess === normalizedTarget) {
        setGameState('won');
      } else if (currentRowIndex === 5) {
        setGameState('lost');
      }
    }, 1500);
  };

  const triggerShake = () => {
    setShakeRow(true);
    setTimeout(() => setShakeRow(false), 500);
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === 'BACKSPACE' || key === 'ENTER' || /^[A-Z]$/.test(key)) {
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameState, revealingRow]);

  const getKeyStatus = (key: string): LetterStatus => {
    let status: LetterStatus = 'empty';
    for (const row of guesses) {
      if (row[0].status === 'empty') continue;
      for (const cell of row) {
        if (normalize(cell.letter) === key) {
          if (cell.status === 'correct') return 'correct';
          if (cell.status === 'present') status = 'present';
          if (cell.status === 'absent' && status === 'empty') status = 'absent';
        }
      }
    }
    return status;
  };

  return (
    <div className="h-full flex flex-col relative bg-[#020617] text-white max-w-md mx-auto shadow-2xl font-sans selection:bg-cyan-500/30 overflow-hidden">
      {/* Dynamic Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e1b4b,transparent)] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 z-10">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90">
          <ArrowLeft size={20} className="text-slate-400" />
        </button>
        
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black tracking-[0.3em] bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
            CATA LETRAS
          </h1>
          <div className="h-1 w-12 bg-cyan-500 rounded-full mt-1 shadow-[0_0_10px_#06b6d4]" />
        </div>
        
        <button onClick={() => setShowHelp(true)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
          <HelpCircle size={20} className="text-slate-400" />
        </button>
      </div>

      {/* Grid Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2.5 z-10">
        {guesses.map((row, rowIndex) => {
          const isCurrentRow = rowIndex === guesses.findIndex(r => r[0].status === 'empty');
          const isRevealing = revealingRow === rowIndex;
          
          return (
            <motion.div 
              key={rowIndex} 
              className="flex gap-2.5"
              animate={shakeRow && isCurrentRow ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              {row.map((cell, cellIndex) => {
                const letter = isCurrentRow ? currentGuess[cellIndex] : (cell.displayLetter || cell.letter);
                const status = (isCurrentRow || isRevealing) ? 'empty' : cell.status;
                
                return (
                  <motion.div
                    key={cellIndex}
                    initial={false}
                    animate={isRevealing ? {
                      rotateX: [0, 90, 0],
                      scale: [1, 1.1, 1],
                      transition: { delay: cellIndex * 0.15, duration: 0.5 }
                    } : {}}
                    className={cn(
                      "w-14 h-14 border-2 rounded-2xl flex items-center justify-center text-3xl font-black uppercase transition-all duration-500",
                      status === 'empty' && !letter && "border-white/5 bg-white/[0.02]",
                      status === 'empty' && letter && "border-white/20 bg-white/10 text-white shadow-xl scale-105",
                      status === 'correct' && "border-cyan-400 bg-cyan-500 text-white shadow-[0_0_25px_rgba(34,211,238,0.4)]",
                      status === 'present' && "border-violet-400 bg-violet-500 text-white shadow-[0_0_25px_rgba(139,92,246,0.4)]",
                      status === 'absent' && "border-slate-800 bg-slate-900 text-slate-600 opacity-40 scale-95"
                    )}
                  >
                    {letter}
                  </motion.div>
                );
              })}
            </motion.div>
          );
        })}
      </div>

      {/* Keyboard */}
      <div className="p-4 pb-8 bg-black/40 backdrop-blur-2xl border-t border-white/5 z-10">
        <div className="flex flex-col gap-2.5 max-w-md mx-auto">
          {KEYBOARD_ROWS.map((row, i) => (
            <div key={i} className="flex justify-center gap-1.5">
              {row.map((key) => {
                if (key === 'BACKSPACE') {
                  return (
                    <button key={key} onClick={() => handleKeyPress('BACKSPACE')} className="h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center active:scale-90">
                      <Delete size={20} />
                    </button>
                  );
                }
                if (key === 'ENTER') {
                  return (
                    <button key={key} onClick={() => handleKeyPress('ENTER')} className="h-12 px-6 rounded-xl bg-cyan-500 text-white font-black text-sm hover:brightness-110 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95">
                      OK
                    </button>
                  );
                }
                
                const status = getKeyStatus(key);
                return (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className={cn(
                      "h-12 flex-1 min-w-[28px] rounded-xl font-bold text-xs transition-all active:scale-90",
                      status === 'empty' && "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10",
                      status === 'correct' && "bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]",
                      status === 'present' && "bg-violet-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.4)]",
                      status === 'absent' && "bg-slate-900 text-slate-600 opacity-30"
                    )}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {gameState !== 'playing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 border border-white/10 p-10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center w-full max-w-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-violet-500" />
              
              {gameState === 'won' ? (
                <>
                  <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                    <Sparkles className="text-cyan-400" size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2 italic">MAGNÍFICO!</h2>
                  <p className="text-slate-400 mb-8">Sua percepção foi cirúrgica.</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="text-red-400" size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2">QUASE LÁ</h2>
                  <p className="text-slate-400 mb-2">A palavra oculta era:</p>
                  <p className="text-2xl font-black text-cyan-400 mb-8 tracking-[0.2em]">{targetWord}</p>
                </>
              )}
              
              <button onClick={startNewGame} className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all shadow-xl active:scale-95">
                NOVA PARTIDA
              </button>
            </motion.div>
          </motion.div>
        )}

        {showHelp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-[#020617] flex flex-col p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black tracking-widest">INTRODUÇÃO</h2>
              <button onClick={() => setShowHelp(false)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center"><X size={24} /></button>
            </div>
            
            <div className="space-y-8 text-slate-300">
              <p className="leading-relaxed">Ache a palavra secreta de 5 letras em 6 tentativas. As cores indicam sua proximidade:</p>
              
              <div className="space-y-4">
                <div className="flex gap-2.5">
                  {['P', 'E', 'D', 'R', 'A'].map((l, i) => (
                    <div key={i} className={cn("w-12 h-12 border-2 rounded-xl flex items-center justify-center font-black text-2xl", i === 0 ? "bg-cyan-500 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]" : "border-white/5 bg-white/5")}>{l}</div>
                  ))}
                </div>
                <p>A letra <span className="font-bold text-cyan-400">P</span> está na posição exata.</p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2.5">
                  {['L', 'I', 'V', 'R', 'O'].map((l, i) => (
                    <div key={i} className={cn("w-12 h-12 border-2 rounded-xl flex items-center justify-center font-black text-2xl", i === 2 ? "bg-violet-500 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.4)]" : "border-white/5 bg-white/5")}>{l}</div>
                  ))}
                </div>
                <p>A letra <span className="font-bold text-violet-400">V</span> existe, mas em outro lugar.</p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2.5">
                  {['M', 'A', 'N', 'T', 'A'].map((l, i) => (
                    <div key={i} className={cn("w-12 h-12 border-2 rounded-xl flex items-center justify-center font-black text-2xl", i === 3 ? "bg-slate-900 border-slate-800 opacity-40" : "border-white/5 bg-white/5")}>{l}</div>
                  ))}
                </div>
                <p>A letra <span className="font-bold text-slate-500">T</span> não faz parte do desafio.</p>
              </div>

              <div className="pt-8 border-t border-white/5 space-y-3 text-xs text-slate-500">
                <p>• Acentuação automática inclusa.</p>
                <p>• Letras podem se repetir.</p>
                <p>• Novas palavras a cada rodada.</p>
              </div>

              <button onClick={() => setShowHelp(false)} className="w-full py-5 bg-cyan-500 text-white font-black rounded-2xl mt-4 shadow-2xl">VAMOS NESSA!</button>
            </div>
          </motion.div>
        )}

        {message && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="absolute top-28 left-1/2 -translate-x-1/2 bg-white text-black px-8 py-3 rounded-2xl font-black shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[60]">
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
