import React from 'react';
import { motion } from 'motion/react';
import { Ghost, Users, Zap } from 'lucide-react';

interface HomeScreenProps {
  onSelectGame: (gameId: string) => void;
}

export function HomeScreen({ onSelectGame }: HomeScreenProps) {
  const games = [
    {
      id: 'impostor',
      title: 'Impostor',
      description: 'Descubra quem está mentindo entre vocês.',
      icon: Ghost,
      color: 'bg-indigo-500',
      bg: 'bg-slate-800',
      border: 'border-slate-700'
    },
    {
      id: 'most-likely',
      title: 'Quem é mais provável',
      description: 'Julgue seus amigos sem dó nem piedade.',
      icon: Users,
      color: 'bg-violet-500',
      bg: 'bg-violet-950/30',
      border: 'border-violet-500/20'
    },
    {
      id: 'charades',
      title: 'Mímica',
      description: 'Atue, gesticule e faça seu time adivinhar!',
      icon: Zap,
      color: 'bg-amber-500',
      bg: 'bg-amber-950/30',
      border: 'border-amber-500/20'
    }
  ];

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 justify-center space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tighter text-white">
          Jogos em Grupo
        </h1>
        <p className="text-slate-400">Escolha um jogo para começar</p>
      </div>

      <div className="grid gap-4 overflow-y-auto pb-4">
        {games.map((game) => (
          <motion.button
            key={game.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectGame(game.id)}
            className={`${game.bg} ${game.border} border p-6 rounded-2xl text-left transition-all group relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <game.icon size={80} />
            </div>
            <div className="relative z-10">
              <div className={`w-12 h-12 ${game.color}/20 rounded-xl flex items-center justify-center mb-4 text-white`}>
                <game.icon size={24} className={game.color.replace('bg-', 'text-')} />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{game.title}</h3>
              <p className="text-sm text-slate-400">{game.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
