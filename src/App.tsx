import React, { useState } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { PassDeviceScreen } from './components/PassDeviceScreen';
import { TimerScreen } from './components/TimerScreen';
import { RevealScreen } from './components/RevealScreen';
import { CATEGORIES } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type GameState = 'setup' | 'passing' | 'timer' | 'reveal';

function App() {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [players, setPlayers] = useState<string[]>([]);
  const [impostorIndex, setImpostorIndex] = useState<number>(0);
  const [secretWord, setSecretWord] = useState<string>('');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  const startGame = (playerNames: string[], categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
    const word = category.words[Math.floor(Math.random() * category.words.length)];
    const newImpostorIndex = Math.floor(Math.random() * playerNames.length);

    setPlayers(playerNames);
    setSecretWord(word);
    setImpostorIndex(newImpostorIndex);
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
    setPlayers([]);
    setSecretWord('');
    setImpostorIndex(0);
    setCurrentPlayerIndex(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-hidden selection:bg-indigo-500/30">
      <AnimatePresence mode="wait">
        {gameState === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-screen"
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
            className="h-screen"
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
            className="h-screen"
          >
            <TimerScreen onFinish={() => setGameState('reveal')} />
          </motion.div>
        )}

        {gameState === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen"
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

export default App;
