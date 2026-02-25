import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RefreshCw, ChevronRight } from 'lucide-react';

interface WhoIsMostLikelyGameProps {
  onBack: () => void;
}

const QUESTIONS = [
  "Quem é mais provável de sobreviver a um apocalipse zumbi?",
  "Quem é mais provável de ficar rico por acidente?",
  "Quem é mais provável de chorar em um filme de comédia?",
  "Quem é mais provável de esquecer o próprio aniversário?",
  "Quem é mais provável de ser preso por algo estúpido?",
  "Quem é mais provável de virar um meme?",
  "Quem é mais provável de gastar todo o salário no primeiro dia?",
  "Quem é mais provável de tropeçar no nada?",
  "Quem é mais provável de adotar 10 gatos?",
  "Quem é mais provável de sumir em uma festa?",
  "Quem é mais provável de rir em um momento sério?",
  "Quem é mais provável de bloquear o ex e desbloquear 5 minutos depois?",
  "Quem é mais provável de comer a comida de outra pessoa na geladeira?",
  "Quem é mais provável de ganhar um reality show?",
  "Quem é mais provável de casar com um estranho em Las Vegas?",
  "Quem é mais provável de gritar ao ver uma barata?",
  "Quem é mais provável de perder o celular segurando ele?",
  "Quem é mais provável de dormir no ônibus e perder o ponto?",
  "Quem é mais provável de fazer drama por um corte de papel?",
  "Quem é mais provável de enviar um print para a pessoa de quem tirou o print?"
];

export function WhoIsMostLikelyGame({ onBack }: WhoIsMostLikelyGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState(() => 
    [...QUESTIONS].sort(() => Math.random() - 0.5)
  );

  const handleNext = () => {
    if (currentIndex < shuffledQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Reshuffle and restart
      setShuffledQuestions([...QUESTIONS].sort(() => Math.random() - 0.5));
      setCurrentIndex(0);
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-violet-950 text-violet-50">
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 z-10 p-2 text-violet-300 hover:text-white transition-colors"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-12">
        <div className="space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-violet-900/50 border border-violet-700/50 text-violet-300 text-xs font-bold uppercase tracking-widest">
            Quem é mais provável
          </span>
          
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentIndex}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="text-3xl md:text-5xl font-bold leading-tight"
            >
              {shuffledQuestions[currentIndex]}
            </motion.h2>
          </AnimatePresence>
        </div>

        <div className="text-violet-400/60 text-sm">
          No 3, apontem para a pessoa!
        </div>
      </div>

      <div className="p-6 pb-8">
        <button
          onClick={handleNext}
          className="w-full bg-white text-violet-950 hover:bg-violet-100 font-bold py-5 rounded-2xl shadow-xl shadow-violet-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
        >
          <span>Próxima Pergunta</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
