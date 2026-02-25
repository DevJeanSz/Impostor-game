import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, User, Play, Trash2, Minus } from 'lucide-react';
import { cn, CATEGORIES } from '../lib/utils';

interface SetupScreenProps {
  onStartGame: (players: string[], impostorCount: number) => void;
}

export function SetupScreen({ onStartGame }: SetupScreenProps) {
  const [players, setPlayers] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [impostorCount, setImpostorCount] = useState(1);

  const [showConfirmClear, setShowConfirmClear] = useState(false);
  
  // Load players from localStorage on mount
  useEffect(() => {
    const savedPlayers = localStorage.getItem('impostor_players');
    if (savedPlayers) {
      try {
        const parsed = JSON.parse(savedPlayers);
        if (Array.isArray(parsed)) {
          setPlayers(parsed);
        }
      } catch (e) {
        console.error('Failed to load players from localStorage', e);
      }
    }
  }, []);

  // Save players to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('impostor_players', JSON.stringify(players));
  }, [players]);

  const addPlayer = () => {
    if (newName.trim()) {
      if (players.includes(newName.trim())) {
        alert('Este jogador já foi adicionado!');
        return;
      }
      setPlayers([...players, newName.trim()]);
      setNewName('');
    }
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const clearAllPlayers = () => {
    setPlayers([]);
    setShowConfirmClear(false);
    localStorage.removeItem('impostor_players');
  };

  const handleStart = () => {
    console.log("handleStart called", { playersLength: players.length, impostorCount });
    if (players.length >= 3) {
      onStartGame(players, impostorCount);
    } else {
      console.warn("Not enough players to start");
    }
  };

  const maxImpostors = Math.max(1, Math.floor((players.length - 1) / 2));

  // Ensure impostor count is valid when players change
  useEffect(() => {
    if (impostorCount > maxImpostors) {
      setImpostorCount(maxImpostors);
    }
  }, [players.length, maxImpostors, impostorCount]);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 justify-center">
      {/* ... header ... */}
      <div className="w-full flex flex-col items-center space-y-8 overflow-y-auto max-h-full py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <div className="text-center space-y-2 shrink-0">
          <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Los Priemos
          </h1>
          <p className="text-slate-400">Quem está mentindo?</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto pt-2">
            Adicione os jogadores e passem o dispositivo. A categoria será secreta!
          </p>
        </div>

        <div className="w-full space-y-4 shrink-0">
          {/* ... player list ... */}
          <div className="flex items-center justify-between h-6">
            <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Participantes ({players.length})
            </label>
            {players.length > 0 && (
              <div className="flex items-center gap-2">
                {showConfirmClear ? (
                  <>
                    <button
                      onClick={clearAllPlayers}
                      className="text-xs text-red-400 font-bold hover:text-red-300 transition-colors"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setShowConfirmClear(false)}
                      className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowConfirmClear(true)}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={12} />
                    Limpar todos
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              placeholder="Nome"
              className="flex-1 bg-slate-800 border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
            />
            <button
              onClick={addPlayer}
              disabled={!newName.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
            >
              <Plus size={24} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {players.map((player, index) => (
                <motion.div
                  key={`${player}-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
                >
                  <User size={14} className="text-slate-400" />
                  <span className="text-sm font-medium">{player}</span>
                  <button
                    onClick={() => removePlayer(index)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {players.length === 0 && (
              <div className="w-full text-center py-6 text-slate-600 italic border-2 border-dashed border-slate-800 rounded-xl text-sm">
                Mínimo 3 jogadores
              </div>
            )}
          </div>
        </div>

        {players.length >= 4 && (
          <div className="w-full space-y-2 shrink-0">
            <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Quantidade de Impostores
            </label>
            <div className="flex items-center gap-4 bg-slate-800 p-2 rounded-xl border border-slate-700">
              <button
                onClick={() => setImpostorCount(Math.max(1, impostorCount - 1))}
                disabled={impostorCount <= 1}
                className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus size={20} />
              </button>
              <span className="flex-1 text-center font-bold text-xl text-white">
                {impostorCount}
              </span>
              <button
                onClick={() => setImpostorCount(Math.min(maxImpostors, impostorCount + 1))}
                disabled={impostorCount >= maxImpostors}
                className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-500 text-center">
              Recomendado: {Math.floor(players.length / 4) || 1}
            </p>
          </div>
        )}

        <div className="w-full pt-4 shrink-0">
          <button
            onClick={handleStart}
            disabled={players.length < 3}
            className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
          >
            <Play size={20} fill="currentColor" />
            Iniciar Jogo
          </button>
        </div>
      </div>
    </div>
  );
}

