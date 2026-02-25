import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Timer, Check, X, RotateCcw, Play } from 'lucide-react';
import { cn } from '../lib/utils';

interface CharadesGameProps {
  onBack: () => void;
}

const CATEGORIES = [
  {
    id: 'movies',
    name: 'Filmes e Séries',
    color: 'bg-amber-500',
    words: ['Titanic', 'Vingadores', 'Harry Potter', 'Star Wars', 'O Rei Leão', 'Matrix', 'Homem-Aranha', 'Frozen', 'Shrek', 'Jurassic Park', 'Friends', 'Stranger Things', 'La Casa de Papel', 'Round 6', 'Game of Thrones', 'Breaking Bad']
  },
  {
    id: 'animals',
    name: 'Animais',
    color: 'bg-emerald-500',
    words: ['Elefante', 'Girafa', 'Pinguim', 'Canguru', 'Macaco', 'Cobra', 'Tubarão', 'Galinha', 'Sapo', 'Leão', 'Preguiça', 'Formiga', 'Baleia', 'Dinossauro', 'Pato', 'Gato']
  },
  {
    id: 'actions',
    name: 'Ações',
    color: 'bg-blue-500',
    words: ['Dançar', 'Cozinhar', 'Nadar', 'Dirigir', 'Pintar', 'Chorar', 'Dormir', 'Pescar', 'Tocar Guitarra', 'Tirar Selfie', 'Jogar Futebol', 'Varrer', 'Passar Roupa', 'Cortar Cabelo', 'Escovar Dentes']
  },
  {
    id: 'objects',
    name: 'Objetos',
    color: 'bg-purple-500',
    words: ['Geladeira', 'Computador', 'Guarda-chuva', 'Violão', 'Espelho', 'Liquidificador', 'Microfone', 'Bola', 'Relógio', 'Óculos', 'Tesoura', 'Martelo', 'Escada', 'Bicicleta', 'Avião']
  },
  {
    id: 'mix',
    name: 'Misturado',
    color: 'bg-rose-500',
    words: [] // Will be populated dynamically
  }
];

// Populate mix category
CATEGORIES.find(c => c.id === 'mix')!.words = CATEGORIES
  .filter(c => c.id !== 'mix')
  .flatMap(c => c.words);

export function CharadesGame({ onBack }: CharadesGameProps) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'finished'>('menu');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [usedWords, setUsedWords] = useState<string[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('finished');
    }
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  const startGame = (category: typeof CATEGORIES[0]) => {
    setSelectedCategory(category);
    setScore(0);
    setUsedWords([]);
    setTimeLeft(60);
    setGameState('playing');
    nextWord(category.words, []);
  };

  const nextWord = (words: string[], used: string[]) => {
    const available = words.filter(w => !used.includes(w));
    if (available.length === 0) {
      setGameState('finished');
      return;
    }
    const word = available[Math.floor(Math.random() * available.length)];
    setCurrentWord(word);
    setUsedWords([...used, word]);
  };

  const handleCorrect = () => {
    setScore(s => s + 1);
    nextWord(selectedCategory.words, usedWords);
  };

  const handleSkip = () => {
    nextWord(selectedCategory.words, usedWords);
  };

  return (
    <div className="h-full flex flex-col relative bg-slate-900 text-slate-50">
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 z-10 p-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={24} />
      </button>

      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col p-6 pt-16"
          >
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-4xl font-bold text-white">Mímica</h1>
              <p className="text-slate-400">Escolha uma categoria para começar</p>
            </div>

            <div className="grid gap-3 overflow-y-auto pb-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => startGame(cat)}
                  className={`${cat.color} p-4 rounded-2xl text-white font-bold text-lg shadow-lg transform transition-all active:scale-95 text-left flex items-center justify-between group`}
                >
                  <span>{cat.name}</span>
                  <Play size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex-1 flex flex-col items-center justify-center p-6"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full font-mono text-xl font-bold">
              <Timer size={20} className={timeLeft <= 10 ? 'text-red-500' : 'text-slate-400'} />
              <span className={timeLeft <= 10 ? 'text-red-500' : 'text-white'}>{timeLeft}s</span>
            </div>

            <div className="flex-1 flex items-center justify-center w-full text-center">
              <motion.h2 
                key={currentWord}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-6xl font-bold break-words leading-tight"
              >
                {currentWord}
              </motion.h2>
            </div>

            <div className="w-full grid grid-cols-2 gap-4 pt-8">
              <button
                onClick={handleSkip}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <X size={32} />
                <span>Pular</span>
              </button>
              <button
                onClick={handleCorrect}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/20"
              >
                <Check size={32} />
                <span>Acertou!</span>
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'finished' && (
          <motion.div 
            key="finished"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-400 uppercase tracking-widest">Tempo Esgotado!</h2>
              <div className="text-8xl font-bold text-white font-mono">{score}</div>
              <p className="text-slate-400">Pontos</p>
            </div>

            <div className="w-full space-y-3">
              <button
                onClick={() => startGame(selectedCategory)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw size={20} />
                Jogar Novamente
              </button>
              <button
                onClick={() => setGameState('menu')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl transition-colors"
              >
                Escolher Categoria
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
