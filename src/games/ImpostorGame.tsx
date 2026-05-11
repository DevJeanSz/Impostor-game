import React, { useState } from 'react';
import { SetupScreen } from '../components/SetupScreen';
import { PassDeviceScreen } from '../components/PassDeviceScreen';
import { TimerScreen } from '../components/TimerScreen';
import { RevealScreen } from '../components/RevealScreen';
import { CATEGORIES } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Globe, WifiOff, Database } from 'lucide-react';
import { getWords, IMPOSTOR_WIKI_MAP, WordSource } from '../services/wikipediaService';

type GameState = 'setup' | 'loading' | 'passing' | 'timer' | 'reveal';

interface ImpostorGameProps {
  onBack: () => void;
}

export function ImpostorGame({ onBack }: ImpostorGameProps) {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [players, setPlayers] = useState<string[]>([]);
  const [impostorIndices, setImpostorIndices] = useState<number[]>([]);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [startingPlayer, setStartingPlayer] = useState<string>('');
  const [pastImpostors, setPastImpostors] = useState<string[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [secretWord, setSecretWord] = useState<string>('');
  const [wordSource, setWordSource] = useState<WordSource>('offline');
  const [categoryName, setCategoryName] = useState<string>('');

  const startGame = async (playerNames: string[], impostorCount: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
    setGameState('loading');
    try {
      // Selecionar categoria aleatória
      const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      setCategoryName(randomCategory.name);

      // Tentar buscar palavras do Wikipedia (com fallback offline automático)
      const wikiConfig = IMPOSTOR_WIKI_MAP[randomCategory.id];
      let allWords: string[] = randomCategory.words;

      if (wikiConfig) {
        const result = await getWords(wikiConfig, `impostor_${randomCategory.id}`, randomCategory.words);
        allWords = result.words;
        setWordSource(result.source);
      } else {
        setWordSource('offline');
      }

      // Filtrar por dificuldade (baseado no tamanho da palavra — mantém compatibilidade)
      let difficultyWords = allWords;
      if (difficulty === 'easy') {
        difficultyWords = allWords.filter(w => w.length <= 6);
      } else if (difficulty === 'medium') {
        difficultyWords = allWords.filter(w => w.length >= 7 && w.length <= 12);
      } else if (difficulty === 'hard') {
        difficultyWords = allWords.filter(w => w.length >= 13);
      }

      // Fallback: se o filtro de dificuldade ficou vazio, usa todas
      if (difficultyWords.length === 0) difficultyWords = allWords;

      // Filtrar palavras já usadas
      const availableWords = difficultyWords.filter(w => !usedWords.includes(w));
      const wordPool = availableWords.length > 0 ? availableWords : difficultyWords;
      const word = wordPool[Math.floor(Math.random() * wordPool.length)];

      setUsedWords(prev => [...prev, word]);

      // Rotação de impostores
      const currentPastImpostors = pastImpostors || [];
      let candidates = playerNames.filter(p => !currentPastImpostors.includes(p));
      let resetHistory = false;

      if (candidates.length < impostorCount) {
        candidates = [...playerNames];
        resetHistory = true;
      }

      const newImpostorIndices: number[] = [];
      const newImpostorNames: string[] = [];
      const availableCandidates = [...candidates];

      for (let i = 0; i < impostorCount; i++) {
        if (availableCandidates.length === 0) break;
        const randomIndex = Math.floor(Math.random() * availableCandidates.length);
        const impostorName = availableCandidates[randomIndex];
        availableCandidates.splice(randomIndex, 1);
        newImpostorNames.push(impostorName);
        const idx = playerNames.indexOf(impostorName);
        if (idx !== -1) newImpostorIndices.push(idx);
      }

      if (resetHistory) {
        setPastImpostors(newImpostorNames);
      } else {
        setPastImpostors(prev => [...(prev || []), ...newImpostorNames]);
      }

      const starter = playerNames[Math.floor(Math.random() * playerNames.length)];

      setPlayers(playerNames);
      setSecretWord(word);
      setImpostorIndices(newImpostorIndices);
      setStartingPlayer(starter);
      setCurrentPlayerIndex(0);
      setGameState('passing');
    } catch (error) {
      console.error('Erro ao iniciar jogo:', error);
      setGameState('setup');
      alert('Ocorreu um erro ao iniciar o jogo. Tente novamente.');
    }
  };

  const handleNextPlayer = () => {
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
    } else {
      setGameState('timer');
    }
  };

  const handlePlayAgain = () => {
    setGameState('setup');
    setSecretWord('');
    setImpostorIndices([]);
    setCurrentPlayerIndex(0);
  };

  // Badge de fonte de dados
  const SourceBadge = () => {
    const config = {
      wikipedia: { icon: Globe, label: 'Wikipedia', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
      cache:     { icon: Database, label: 'Cache', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
      offline:   { icon: WifiOff, label: 'Offline', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
    }[wordSource];

    const Icon = config.icon;
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
        <Icon size={10} />
        {config.label}
      </div>
    );
  };

  return (
    <div className="h-full relative">
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full"
          >
            <SetupScreen onStartGame={startGame} />
          </motion.div>
        )}

        {/* Tela de carregamento — busca no Wikipedia */}
        {gameState === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col items-center justify-center gap-6 p-8 text-center"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <Globe className="absolute inset-0 m-auto text-indigo-400" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-1">Buscando palavras</h3>
              <p className="text-slate-500 text-sm">Consultando a Wikipedia em português...</p>
            </div>
            <p className="text-xs text-slate-600 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
              Se não houver internet, usaremos a lista offline 📦
            </p>
          </motion.div>
        )}

        {gameState === 'passing' && (
          <motion.div
            key={`passing-${currentPlayerIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full"
          >
            {/* Badge de fonte no canto */}
            <div className="absolute top-4 right-4 z-20">
              <SourceBadge />
            </div>
            <PassDeviceScreen
              currentPlayer={players[currentPlayerIndex]}
              isImpostor={impostorIndices.includes(currentPlayerIndex)}
              secretWord={secretWord}
              onNext={handleNextPlayer}
              playerIndex={currentPlayerIndex}
              totalPlayers={players.length}
            />
          </motion.div>
        )}

        {gameState === 'timer' && (
          <motion.div
            key="timer"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="h-full"
          >
            <TimerScreen
              onFinish={() => setGameState('reveal')}
              startingPlayer={startingPlayer}
            />
          </motion.div>
        )}

        {gameState === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <RevealScreen
              impostorNames={impostorIndices.map(i => players[i])}
              secretWord={secretWord}
              onPlayAgain={handlePlayAgain}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
