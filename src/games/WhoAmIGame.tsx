import React, { useState } from 'react';
import { SetupScreen } from '../components/SetupScreen';
import { TimerScreen } from '../components/TimerScreen';
import { WHO_AM_I_CATEGORIES } from '../data/whoAmICharacters';
import { getWords, WHO_AM_I_WIKI_MAP, WordSource } from '../services/wikipediaService';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, User, Eye, EyeOff, Globe, Database, WifiOff } from 'lucide-react';
import { cn } from '../lib/utils';

type GameState = 'setup' | 'loading' | 'passing' | 'timer' | 'reveal';

interface PlayerCharacter {
  name: string;
  character: string;
}

interface WhoAmIGameProps {
  onBack: () => void;
}

export function WhoAmIGame({ onBack }: WhoAmIGameProps) {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [players, setPlayers] = useState<PlayerCharacter[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [category, setCategory] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('');
  const [wordSource, setWordSource] = useState<WordSource>('offline');

  const startGame = async (
    playerNames: string[],
    _impostorCount: number,
    _difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ) => {
    setGameState('loading');
    try {
      // Selecionar categoria aleatória do arquivo local
      const localCategory = WHO_AM_I_CATEGORIES[Math.floor(Math.random() * WHO_AM_I_CATEGORIES.length)];
      setCategory(localCategory.name);
      setCategoryEmoji(localCategory.emoji);

      // Tentar enriquecer com Wikipedia (ou usar local como fallback)
      const wikiConfig = WHO_AM_I_WIKI_MAP[localCategory.id];
      let characters: string[] = localCategory.characters;

      if (wikiConfig) {
        const result = await getWords(wikiConfig, `whoami_${localCategory.id}`, localCategory.characters);
        characters = result.words;
        setWordSource(result.source);
      } else {
        // Categoria sem mapeamento Wikipedia (fictícias: super-heróis, anime...) — usar local
        setWordSource('offline');
      }

      // Embaralhar e distribuir personagens únicos para cada jogador
      const shuffled = [...characters].sort(() => Math.random() - 0.5);
      const assigned = playerNames.map((name, i) => ({
        name,
        character: shuffled[i % shuffled.length],
      }));

      setPlayers(assigned);
      setCurrentPlayerIndex(0);
      setShowContent(false);
      setGameState('passing');
    } catch (error) {
      console.error('Erro ao iniciar jogo:', error);
      setGameState('setup');
      alert('Ocorreu um erro ao iniciar o jogo. Tente novamente.');
    }
  };

  const handleNextPlayer = () => {
    setShowContent(false);
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
    } else {
      setGameState('timer');
    }
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
    <div className="h-full relative bg-slate-900 text-white overflow-hidden">
      {gameState === 'setup' && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-10 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
      )}

      <AnimatePresence mode="wait">

        {/* ─── Setup ──────────────────────────────────────────── */}
        {gameState === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-full"
          >
            <SetupScreen
              onStartGame={startGame}
              title="Quem Sou Eu?"
              subtitle="Cada jogador recebe um personagem secreto!"
              hideImpostorCount
            />
          </motion.div>
        )}

        {/* ─── Loading — busca no Wikipedia ───────────────────── */}
        {gameState === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col items-center justify-center gap-6 p-8 text-center"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin" />
              <Globe className="absolute inset-0 m-auto text-rose-400" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-1">Buscando personagens</h3>
              <p className="text-slate-500 text-sm">Consultando a Wikipedia em português...</p>
            </div>
            <p className="text-xs text-slate-600 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
              Se não houver internet, usaremos a lista offline 📦
            </p>
          </motion.div>
        )}

        {/* ─── Passando o dispositivo ──────────────────────────── */}
        {gameState === 'passing' && (
          <motion.div
            key={`passing-${currentPlayerIndex}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="h-full flex flex-col items-center justify-center p-6 text-center"
          >
            {!showContent ? (
              <div className="space-y-8 w-full max-w-sm">
                <div className="w-24 h-24 bg-rose-600 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(225,29,72,0.4)]">
                  <User size={48} className="text-white" />
                </div>
                <div>
                  <h3 className="text-slate-400 uppercase tracking-widest text-sm font-bold mb-2">
                    Vez de:
                  </h3>
                  <h2 className="text-5xl font-black text-white">{players[currentPlayerIndex].name}</h2>
                </div>
                <p className="text-slate-400 text-sm px-8">
                  Pegue o dispositivo. Você verá os personagens de todos os outros jogadores, exceto o seu!
                </p>
                <button
                  onClick={() => setShowContent(true)}
                  className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-xl"
                >
                  <Eye size={24} />
                  VER PERSONAGENS
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col pt-10">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between px-2">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                      Personagens dos Outros
                    </h2>
                    <p className="text-rose-400 font-bold text-sm mt-0.5">
                      {categoryEmoji} {category}
                    </p>
                  </div>
                  <SourceBadge />
                </div>

                {/* Lista */}
                <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar px-2">
                  {players.map((p, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-4 rounded-2xl flex items-center justify-between border transition-all',
                        idx === currentPlayerIndex
                          ? 'bg-slate-800/50 border-slate-700 opacity-40'
                          : 'bg-white/5 border-white/10'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                            idx === currentPlayerIndex
                              ? 'bg-slate-700 text-slate-500'
                              : 'bg-rose-600 text-white'
                          )}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <div className="text-xs text-slate-500 font-bold uppercase">{p.name}</div>
                          <div className="text-lg font-bold">
                            {idx === currentPlayerIndex ? '???' : p.character}
                          </div>
                        </div>
                      </div>
                      {idx === currentPlayerIndex && <EyeOff size={20} className="text-slate-600" />}
                    </div>
                  ))}
                </div>

                {/* Botão avançar */}
                <div className="p-4 pt-4">
                  <button
                    onClick={handleNextPlayer}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95"
                  >
                    {currentPlayerIndex === players.length - 1 ? 'INICIAR JOGO' : 'PRÓXIMO JOGADOR'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Timer ──────────────────────────────────────────── */}
        {gameState === 'timer' && (
          <motion.div
            key="timer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col"
          >
            <div className="text-center px-6 pt-4 pb-2 shrink-0">
              <p className="text-xs text-slate-500 bg-slate-800/80 rounded-xl px-4 py-2 inline-block border border-slate-700">
                💡 Faça perguntas respondidas com{' '}
                <strong className="text-slate-300">"Sim"</strong> ou{' '}
                <strong className="text-slate-300">"Não"</strong>!
              </p>
            </div>
            <div className="flex-1">
              <TimerScreen
                onFinish={() => setGameState('reveal')}
                startingPlayer={players[Math.floor(Math.random() * players.length)].name}
              />
            </div>
          </motion.div>
        )}

        {/* ─── Revelação ──────────────────────────────────────── */}
        {gameState === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col p-6"
          >
            <div className="mt-10 mb-6 text-center">
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-1">Revelação</h2>
              <p className="text-slate-400 text-sm">Aqui estão os personagens de todos!</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
              {players.map((p, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="bg-white/5 border border-white/10 p-5 rounded-3xl flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center text-xl font-black shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-black uppercase tracking-widest">{p.name}</div>
                    <div className="text-xl font-black text-[#f0d0a0] truncate">{p.character}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <button
              onClick={() => setGameState('setup')}
              className="w-full bg-white text-black font-black py-4 rounded-2xl mt-6 shadow-xl active:scale-95 transition-transform"
            >
              JOGAR NOVAMENTE
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
