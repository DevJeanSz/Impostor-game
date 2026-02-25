import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react';
import { cn, playBeep, playAlarm } from '../lib/utils';

interface TimerScreenProps {
  onFinish: () => void;
}

export function TimerScreen({ onFinish }: TimerScreenProps) {
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes default
  const [isActive, setIsActive] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newValue = prev - 1;
          
          // Sound logic
          if (newValue <= 5 && newValue > 0 && audioContextRef.current) {
            playBeep(audioContextRef.current);
          } else if (newValue === 0 && audioContextRef.current) {
            playAlarm(audioContextRef.current);
          }
          
          return newValue;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(120);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / 120) * 100;

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6">
      <div className="flex-none text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold text-white">Debate</h2>
        <p className="text-slate-400">Descubram quem é o impostor!</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto min-h-0 space-y-8">
        <div className="relative flex items-center justify-center shrink-0">
          {/* Circular Progress Background */}
          <svg className="w-56 h-56 sm:w-64 sm:h-64 transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-800"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={2 * Math.PI * (window.innerWidth < 640 ? 100 : 120)} // Approx radius
              pathLength={100}
              strokeDashoffset={100 - progress}
              className={cn(
                "transition-all duration-1000 ease-linear",
                timeLeft <= 10 ? "text-red-500" : "text-indigo-500"
              )}
            />
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn(
              "text-5xl sm:text-6xl font-mono font-bold tracking-tighter",
              timeLeft <= 10 ? "text-red-500" : "text-white"
            )}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-6 shrink-0">
          <button
            onClick={toggleTimer}
            className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition-colors"
          >
            {isActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>
          
          <button
            onClick={resetTimer}
            className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw size={24} />
          </button>
        </div>
      </div>

      <div className="pt-8 mt-auto flex-none">
        <button
          onClick={onFinish}
          className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
        >
          <CheckCircle2 size={20} />
          Revelar Impostor
        </button>
      </div>
    </div>
  );
}
