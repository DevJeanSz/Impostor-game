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
  const [impostorIndices, setImpostorIndices] = useState<number[]>([]);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [startingPlayer, setStartingPlayer] = useState<string>('');
  const [pastImpostors, setPastImpostors] = useState<string[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [secretWord, setSecretWord] = useState<string>('');

  const startGame = (playerNames: string[], impostorCount: number) => {
    try {
      console.log("Starting game with:", { playerNames, impostorCount });

      if (!CATEGORIES || CATEGORIES.length === 0) {
        console.error("No categories found");
        alert("Erro: Nenhuma categoria encontrada.");
        return;
      }

      // Select random category
      const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      console.log("Selected category:", randomCategory.name);
      
      // Filter out used words for this category if possible
      const availableWords = randomCategory.words.filter(w => !usedWords.includes(w));
      
      // If all words used, reset pool for this category (or just pick random if really stuck)
      const wordPool = availableWords.length > 0 ? availableWords : randomCategory.words;
      const word = wordPool[Math.floor(Math.random() * wordPool.length)];
      console.log("Selected word:", word);
      
      // Add to used words
      setUsedWords(prev => [...prev, word]);
      
      // Impostor rotation logic - now supporting multiple impostors
      // Ensure pastImpostors is defined
      const currentPastImpostors = pastImpostors || [];
      let candidates = playerNames.filter(p => !currentPastImpostors.includes(p));
      let resetHistory = false;
      
      console.log("Candidates:", candidates);

      // If not enough candidates for the requested impostor count, reset the pool
      if (candidates.length < impostorCount) {
        console.log("Not enough candidates, resetting history");
        candidates = [...playerNames]; // Create a copy to be safe
        resetHistory = true;
      }
      
      // Select N unique impostors
      const newImpostorIndices: number[] = [];
      const newImpostorNames: string[] = [];
      
      // Create a copy of candidates to pick from
      const availableCandidates = [...candidates];
      
      for (let i = 0; i < impostorCount; i++) {
        if (availableCandidates.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * availableCandidates.length);
        const impostorName = availableCandidates[randomIndex];
        
        // Remove selected candidate so they aren't picked again
        availableCandidates.splice(randomIndex, 1);
        
        newImpostorNames.push(impostorName);
        const idx = playerNames.indexOf(impostorName);
        if (idx !== -1) {
          newImpostorIndices.push(idx);
        }
      }
      
      console.log("New impostors:", newImpostorNames);

      // Update past impostors
      if (resetHistory) {
        setPastImpostors(newImpostorNames);
      } else {
        setPastImpostors(prev => [...(prev || []), ...newImpostorNames]);
      }

      // Pick random starting player
      const starter = playerNames[Math.floor(Math.random() * playerNames.length)];

      setPlayers(playerNames);
      setSecretWord(word);
      setImpostorIndices(newImpostorIndices);
      setStartingPlayer(starter);
      setCurrentPlayerIndex(0);
      setGameState('passing');
      console.log("Game state set to passing");
    } catch (error) {
      console.error("Error starting game:", error);
      alert("Ocorreu um erro ao iniciar o jogo. Tente novamente.");
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
