import React, { useState } from 'react';
import { SetupScreen } from '../components/SetupScreen';
import { PassDeviceScreen } from '../components/PassDeviceScreen';
import { TimerScreen } from '../components/TimerScreen';
import { RevealScreen } from '../components/RevealScreen';
import { CATEGORIES } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

type GameState = 'setup' | 'passing' | 'timer' | 'reveal';

interface ImpostorGameProps {
  onBack: () => void;
}

export function ImpostorGame({ onBack }: ImpostorGameProps) {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [players, setPlayers] = useState<string[]>([]);
  const [impostorIndex, setImpostorIndex] = useState<number>(0);
  const [secretWord, setSecretWord] = useState<string>('');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [startingPlayer, setStartingPlayer] = useState<string>('');
  const [pastImpostors, setPastImpostors] = useState<string[]>([]);

  const startGame = (playerNames: string[], categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
    const word = category.words[Math.floor(Math.random() * category.words.length)];
    
    // Impostor rotation logic
    let candidates = playerNames.filter(p => !pastImpostors.includes(p));
    
    // If everyone has been impostor, reset the pool
    if (candidates.length === 0) {
      candidates = playerNames;
      setPastImpostors([]);
    }
    
    const impostorName = candidates[Math.floor(Math.random() * candidates.length)];
    const newImpostorIndex = playerNames.indexOf(impostorName);
    
    // Update past impostors
    setPastImpostors(prev => {
      const newHistory = candidates.length === playerNames.length ? [impostorName] : [...prev, impostorName];
      return newHistory;
    });

    // Pick random starting player
    const starter = playerNames[Math.floor(Math.random() * playerNames.length)];

    setPlayers(playerNames);
    setSecretWord(word);
    setImpostorIndex(newImpostorIndex);
    setStartingPlayer(starter);
    setCurrentPlayerIndex(0);
    setGameState('passing');
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
    setImpostorIndex(0);
    setCurrentPlayerIndex(0);
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

        {gameState === 'passing' && (
          <motion.div
            key={`passing-${currentPlayerIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full"
          >
            <PassDeviceScreen
              currentPlayer={players[currentPlayerIndex]}
              isImpostor={currentPlayerIndex === impostorIndex}
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
              impostorName={players[impostorIndex]}
              secretWord={secretWord}
              onPlayAgain={handlePlayAgain}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
