import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RotateCcw, Delete, CornerDownLeft, Trophy, XCircle, HelpCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { TERMO_WORDS } from '../data/termoWords';

interface TermoGameProps {
  onBack: () => void;
}

type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

interface Cell {
  letter: string;
  status: LetterStatus;
  displayLetter?: string; // Para mostrar com acento
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'BACKSPACE'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'ENTER']
];

// Função para remover acentos para comparação
const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

export function TermoGame({ onBack }: TermoGameProps) {
  const [targetWord, setTargetWord] = useState(''); // Palavra com acento (ex: SÁBIO)
  const [guesses, setGuesses] = useState<Cell[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [message, setMessage] = useState('');
  const [shakeRow, setShakeRow] = useState(false);
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const hasSeenHelp = localStorage.getItem('termo_help_seen');
    if (!hasSeenHelp) {
      setShowHelp(true);
      localStorage.setItem('termo_help_seen', 'true');
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
      showMessage('Palavra muito curta');
      triggerShake();
      return;
    }

    const normalizedTarget = normalize(targetWord);
    const normalizedGuess = normalize(currentGuess);

    // No Termo original, qualquer palavra de 5 letras costuma ser aceita se estiver na lista
    if (!TERMO_WORDS.map(w => normalize(w)).includes(normalizedGuess)) {
      showMessage('Palavra inválida');
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

    // Primeiro passo: corretas
    guessLetters.forEach((letter, i) => {
      if (letter === targetLetters[i]) {
        newRow[i] = { 
          letter, 
          status: 'correct', 
          displayLetter: originalTargetLetters[i] 
        };
        targetLetters[i] = ''; 
      } else {
        newRow[i] = { letter, status: 'empty' }; 
      }
    });

    // Segundo passo: presentes/ausentes
    guessLetters.forEach((letter, i) => {
      if (newRow[i].status !== 'correct') {
        const targetIndex = targetLetters.indexOf(letter);
        if (targetIndex !== -1) {
          newRow[i] = { 
            letter, 
            status: 'present', 
            displayLetter: originalTargetLetters[guessLetters.indexOf(letter, i)] // Simplificação
          };
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
          if (cell.status === 'present' && status !== 'correct') status = 'present';
          if (cell.status === 'absent' && status === 'empty') status = 'absent';
        }
      }
    }
    return status;
  };

  return (
    <div className="h-full flex flex-col relative bg-[#6e5c62] text-white max-w-md mx-auto shadow-2xl font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#6e5c62] z-10">
        <div className="flex gap-2">
          <button onClick={onBack} className="w-9 h-9 rounded-md bg-[#4c4347] flex items-center justify-center hover:brightness-110 transition-all">
            <ArrowLeft size={18} />
          </button>
          <button onClick={() => setShowHelp(true)} className="w-9 h-9 rounded-md bg-[#4c4347] flex items-center justify-center hover:brightness-110 transition-all">
            <HelpCircle size={18} />
          </button>
        </div>
        
        <h1 className="text-3xl font-black tracking-tighter">TERMO</h1>
        
        <button onClick={startNewGame} className="w-9 h-9 rounded-md bg-[#4c4347] flex items-center justify-center hover:brightness-110 transition-all">
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Grid Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-1.5">
        {guesses.map((row, rowIndex) => {
          const isCurrentRow = rowIndex === guesses.findIndex(r => r[0].status === 'empty');
          const isRevealing = revealingRow === rowIndex;
          
          return (
            <motion.div 
              key={rowIndex} 
              className="flex gap-1.5"
              animate={shakeRow && isCurrentRow ? { x: [-5, 5, -5, 5, 0] } : {}}
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
                      rotateY: [0, 90, 0],
                      transition: { delay: cellIndex * 0.2, duration: 0.5 }
                    } : {}}
                    className={cn(
                      "w-14 h-14 border-2 rounded-md flex items-center justify-center text-3xl font-black uppercase transition-all duration-300",
                      status === 'empty' && !letter && "border-[#4c4347] bg-transparent",
                      status === 'empty' && letter && "border-[#4c4347] bg-[#4c4347] text-white",
                      status === 'correct' && "border-[#3aa1fb] bg-[#3aa1fb] text-white",
                      status === 'present' && "border-[#d18140] bg-[#d18140] text-white",
                      status === 'absent' && "border-[#312a2c] bg-[#312a2c] text-white opacity-40"
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
      <div className="p-2 pb-6">
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          {KEYBOARD_ROWS.map((row, i) => (
            <div key={i} className="flex justify-center gap-1.5">
              {row.map((key) => {
                if (key === 'BACKSPACE') {
                  return (
                    <button key={key} onClick={() => handleKeyPress('BACKSPACE')} className="h-14 px-4 rounded-md bg-[#4c4347] text-white flex items-center justify-center">
                      <Delete size={20} />
                    </button>
                  );
                }
                if (key === 'ENTER') {
                  return (
                    <button key={key} onClick={() => handleKeyPress('ENTER')} className="h-14 px-6 rounded-md bg-[#4c4347] text-white font-black text-sm">
                      ENTER
                    </button>
                  );
                }
                
                const status = getKeyStatus(key);
                return (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className={cn(
                      "h-14 flex-1 min-w-[32px] rounded-md font-black text-sm transition-all",
                      status === 'empty' && "bg-[#4c4347] text-white",
                      status === 'correct' && "bg-[#3aa1fb] text-white",
                      status === 'present' && "bg-[#d18140] text-white",
                      status === 'absent' && "bg-[#312a2c] text-white opacity-40"
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-[#6e5c62]/90 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#4c4347] p-8 rounded-2xl shadow-2xl text-center w-full max-w-xs border border-white/10">
              <h2 className="text-3xl font-black text-white mb-4">{gameState === 'won' ? 'BRILHANTE!' : 'QUASE...'}</h2>
              <p className="text-white/60 mb-2">A PALAVRA ERA</p>
              <p className="text-3xl font-black text-[#3aa1fb] mb-8 tracking-widest">{targetWord}</p>
              <button onClick={startNewGame} className="w-full py-4 bg-[#3aa1fb] text-white font-black rounded-xl hover:brightness-110 shadow-lg">JOGAR NOVAMENTE</button>
            </motion.div>
          </motion.div>
        )}

        {showHelp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-[#6e5c62] flex flex-col p-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black">COMO JOGAR</h2>
              <button onClick={() => setShowHelp(false)} className="w-9 h-9 rounded-md bg-[#4c4347] flex items-center justify-center"><X size={20} /></button>
            </div>
            
            <div className="space-y-6 text-sm">
              <p>Descubra a palavra certa em 6 tentativas. Depois de cada tentativa, as peças mostram o quão perto você está da solução.</p>
              
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  {['T', 'U', 'R', 'M', 'A'].map((l, i) => (
                    <div key={i} className={cn("w-12 h-12 border-2 rounded-md flex items-center justify-center font-black text-2xl", i === 0 ? "bg-[#3aa1fb] border-[#3aa1fb]" : "border-[#4c4347]")}>{l}</div>
                  ))}
                </div>
                <p>A letra <span className="font-bold">T</span> faz parte da palavra e está na posição correta.</p>
              </div>

              <div className="space-y-2">
                <div className="flex gap-1.5">
                  {['V', 'I', 'O', 'L', 'A'].map((l, i) => (
                    <div key={i} className={cn("w-12 h-12 border-2 rounded-md flex items-center justify-center font-black text-2xl", i === 2 ? "bg-[#d18140] border-[#d18140]" : "border-[#4c4347]")}>{l}</div>
                  ))}
                </div>
                <p>A letra <span className="font-bold">O</span> faz parte da palavra mas em outra posição.</p>
              </div>

              <div className="space-y-2">
                <div className="flex gap-1.5">
                  {['P', 'U', 'L', 'G', 'A'].map((l, i) => (
                    <div key={i} className={cn("w-12 h-12 border-2 rounded-md flex items-center justify-center font-black text-2xl", i === 3 ? "bg-[#312a2c] border-[#312a2c] opacity-40" : "border-[#4c4347]")}>{l}</div>
                  ))}
                </div>
                <p>A letra <span className="font-bold">G</span> não faz parte da palavra.</p>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-2 text-xs opacity-60">
                <p>• Os acentos são preenchidos automaticamente.</p>
                <p>• As palavras podem possuir letras repetidas.</p>
                <p>• Uma palavra nova aparece a cada partida.</p>
              </div>

              <button onClick={() => setShowHelp(false)} className="w-full py-4 bg-[#3aa1fb] text-white font-black rounded-xl mt-4">ENTENDI!</button>
            </div>
          </motion.div>
        )}

        {message && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-24 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-2 rounded-md font-black shadow-2xl z-[60]">
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
