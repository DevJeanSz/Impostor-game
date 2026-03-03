import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RotateCcw, Delete, CornerDownLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { TERMO_WORDS } from '../data/termoWords';

interface TermoGameProps {
  onBack: () => void;
}

type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

interface Cell {
  letter: string;
  status: LetterStatus;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

export function TermoGame({ onBack }: TermoGameProps) {
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<Cell[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [message, setMessage] = useState('');
  const [shakeRow, setShakeRow] = useState(false);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    const randomWord = TERMO_WORDS[Math.floor(Math.random() * TERMO_WORDS.length)];
    setTargetWord(randomWord);
    setGuesses(Array(6).fill(null).map(() => Array(5).fill({ letter: '', status: 'empty' })));
    setCurrentGuess('');
    setGameState('playing');
    setMessage('');
  };

  const handleKeyPress = (key: string) => {
    if (gameState !== 'playing') return;

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
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 500);
      return;
    }

    if (!TERMO_WORDS.includes(currentGuess)) {
      showMessage('Palavra não encontrada');
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 500);
      return;
    }

    const currentRowIndex = guesses.findIndex(row => row[0].status === 'empty');
    const newGuesses = [...guesses];
    const newRow: Cell[] = [];
    const targetLetters = targetWord.split('');
    const guessLetters = currentGuess.split('');

    // First pass: check correct letters
    guessLetters.forEach((letter, i) => {
      if (letter === targetLetters[i]) {
        newRow[i] = { letter, status: 'correct' };
        targetLetters[i] = ''; // Mark as used
      } else {
        newRow[i] = { letter, status: 'empty' }; // Placeholder
      }
    });

    // Second pass: check present/absent
    guessLetters.forEach((letter, i) => {
      if (newRow[i].status !== 'correct') {
        const targetIndex = targetLetters.indexOf(letter);
        if (targetIndex !== -1) {
          newRow[i] = { letter, status: 'present' };
          targetLetters[targetIndex] = ''; // Mark as used
        } else {
          newRow[i] = { letter, status: 'absent' };
        }
      }
    });

    newGuesses[currentRowIndex] = newRow;
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (currentGuess === targetWord) {
      setGameState('won');
      showMessage('Você venceu!');
    } else if (currentRowIndex === 5) {
      setGameState('lost');
      showMessage(`A palavra era: ${targetWord}`);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  };

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === 'BACKSPACE' || key === 'ENTER' || /^[A-Z]$/.test(key)) {
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameState]);

  const getKeyStatus = (key: string): LetterStatus => {
    let status: LetterStatus = 'empty';
    for (const row of guesses) {
      for (const cell of row) {
        if (cell.letter === key) {
          if (cell.status === 'correct') return 'correct';
          if (cell.status === 'present' && status !== 'correct') status = 'present';
          if (cell.status === 'absent' && status === 'empty') status = 'absent';
        }
      }
    }
    return status;
  };

  return (
    <div className="h-full flex flex-col relative bg-slate-900 text-slate-50 max-w-md mx-auto">
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <button 
          onClick={onBack}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold tracking-wider">CATA LETRAS</h1>
        <button 
          onClick={startNewGame}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <RotateCcw size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-2">
        {guesses.map((row, rowIndex) => {
          const isCurrentRow = rowIndex === guesses.findIndex(r => r[0].status === 'empty');
          return (
            <motion.div 
              key={rowIndex} 
              className={cn("flex gap-2", shakeRow && isCurrentRow && "animate-shake")}
              animate={shakeRow && isCurrentRow ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              {row.map((cell, cellIndex) => {
                const letter = isCurrentRow ? currentGuess[cellIndex] : cell.letter;
                const status = isCurrentRow ? 'empty' : cell.status;
                return (
                  <div
                    key={cellIndex}
                    className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 border-2 rounded-lg flex items-center justify-center text-2xl font-bold uppercase transition-all duration-500 flip-card",
                      status === 'empty' && !letter && "border-slate-700 bg-transparent",
                      status === 'empty' && letter && "border-slate-500 bg-transparent text-white scale-105",
                      status === 'correct' && "border-green-600 bg-green-600 text-white",
                      status === 'present' && "border-yellow-600 bg-yellow-600 text-white",
                      status === 'absent' && "border-slate-700 bg-slate-700 text-slate-400"
                    )}
                  >
                    {letter}
                  </div>
                );
              })}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-100 text-slate-900 px-4 py-2 rounded-lg font-bold shadow-lg z-20"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-2 pb-6 bg-slate-900">
        <div className="flex flex-col gap-2">
          {KEYBOARD_ROWS.map((row, i) => (
            <div key={i} className="flex justify-center gap-1.5">
              {row.map((key) => {
                const status = getKeyStatus(key);
                return (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className={cn(
                      "h-12 min-w-[32px] sm:min-w-[40px] px-1 rounded-md font-bold text-sm sm:text-base transition-colors",
                      status === 'empty' && "bg-slate-700 text-white hover:bg-slate-600",
                      status === 'correct' && "bg-green-600 text-white",
                      status === 'present' && "bg-yellow-600 text-white",
                      status === 'absent' && "bg-slate-800 text-slate-500"
                    )}
                  >
                    {key}
                  </button>
                );
              })}
              {i === 2 && (
                <>
                  <button
                    onClick={() => handleKeyPress('BACKSPACE')}
                    className="h-12 px-3 rounded-md bg-slate-700 text-white hover:bg-slate-600 flex items-center justify-center"
                  >
                    <Delete size={20} />
                  </button>
                  <button
                    onClick={() => handleKeyPress('ENTER')}
                    className="h-12 px-3 rounded-md bg-slate-700 text-white hover:bg-slate-600 flex items-center justify-center"
                  >
                    <CornerDownLeft size={20} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
