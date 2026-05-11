import React, { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { ImpostorGame } from './games/ImpostorGame';
import { WhoIsMostLikelyGame } from './games/WhoIsMostLikelyGame';
import { CharadesGame } from './games/CharadesGame';
import { TermoGame } from './games/TermoGame';
import { DominoGame } from './games/DominoGame';
import { WhoAmIGame } from './games/WhoAmIGame';

import { AnimatePresence, motion } from 'motion/react';

function App() {
  const [currentGame, setCurrentGame] = useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get('game');
    if (gameParam === 'domino') {
      setCurrentGame('domino');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-hidden selection:bg-indigo-500/30">
      <AnimatePresence mode="wait">
        {!currentGame ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-screen"
          >
            <HomeScreen onSelectGame={setCurrentGame} />
          </motion.div>
        ) : currentGame === 'impostor' ? (
          <motion.div
            key="impostor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-screen"
          >
            <ImpostorGame onBack={() => setCurrentGame(null)} />
          </motion.div>
        ) : currentGame === 'most-likely' ? (
          <motion.div
            key="most-likely"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-screen"
          >
            <WhoIsMostLikelyGame onBack={() => setCurrentGame(null)} />
          </motion.div>
        ) : currentGame === 'charades' ? (
          <motion.div
            key="charades"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-screen"
          >
            <CharadesGame onBack={() => setCurrentGame(null)} />
          </motion.div>
        ) : currentGame === 'termo' ? (
          <motion.div
            key="termo"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-screen"
          >
            <TermoGame onBack={() => setCurrentGame(null)} />
          </motion.div>
        ) : currentGame === 'domino' ? (
          <motion.div
            key="domino"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-screen"
          >
            <DominoGame onBack={() => setCurrentGame(null)} />
          </motion.div>
        ) : currentGame === 'who-am-i' ? (
          <motion.div
            key="who-am-i"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-screen"
          >
            <WhoAmIGame onBack={() => setCurrentGame(null)} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default App;
