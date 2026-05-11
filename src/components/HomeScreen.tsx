import React from 'react';
import { motion } from 'motion/react';
import { Ghost, Users, Zap, Type, GripHorizontal, User } from 'lucide-react';

interface HomeScreenProps {
  onSelectGame: (gameId: string) => void;
}

export function HomeScreen({ onSelectGame }: HomeScreenProps) {
  const games = [
    {
      id: 'impostor',
      title: 'Quem é o impostor?',
      description: 'Descubra quem está mentindo entre vocês.',
      icon: Ghost,
      color: 'bg-indigo-500',
      iconBg: 'bg-indigo-500/20',
      iconColor: 'text-indigo-400',
      bg: 'bg-slate-800',
      border: 'border-slate-700'
    },
    {
      id: 'most-likely',
      title: 'Quem é mais provável',
      description: 'Julgue seus amigos sem dó nem piedade.',
      icon: Users,
      color: 'bg-violet-500',
      iconBg: 'bg-violet-500/20',
      iconColor: 'text-violet-400',
      bg: 'bg-violet-950/30',
      border: 'border-violet-500/20'
    },
    {
      id: 'charades',
      title: 'Mímica',
      description: 'Atue, gesticule e faça seu time adivinhar!',
      icon: Zap,
      color: 'bg-amber-500',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      bg: 'bg-amber-950/30',
      border: 'border-amber-500/20'
    },
    {
      id: 'termo',
      title: 'Cata Letras',
      description: 'Descubra a palavra secreta em 6 tentativas.',
      icon: Type,
      color: 'bg-emerald-500',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
      bg: 'bg-emerald-950/30',
      border: 'border-emerald-500/20'
    },
    {
      id: 'who-am-i',
      title: 'Quem Sou Eu?',
      description: 'Adivinhe quem você é com ajuda dos amigos.',
      icon: User,
      color: 'bg-rose-500',
      iconBg: 'bg-rose-500/20',
      iconColor: 'text-rose-400',
      bg: 'bg-rose-950/30',
      border: 'border-rose-500/20'
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

      <div className="grid gap-4 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {games.map((game) => (
          <motion.button
            key={game.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectGame(game.id)}
            className={`${game.bg} ${game.border} border p-4 rounded-2xl text-left transition-all group relative overflow-hidden flex items-center gap-4`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <game.icon size={80} />
            </div>
            
            <div className={`w-12 h-12 ${game.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
              <game.icon size={24} className={game.iconColor} />
            </div>
            
            <div className="relative z-10 flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white mb-0.5 truncate">{game.title}</h3>
              <p className="text-sm text-slate-400 leading-tight">{game.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
