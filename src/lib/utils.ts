import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORIES = [
  {
    id: 'animals',
    name: 'Animais',
    words: ['Leão', 'Elefante', 'Girafa', 'Macaco', 'Cachorro', 'Gato', 'Pinguim', 'Tubarão', 'Águia', 'Cobra']
  },
  {
    id: 'food',
    name: 'Comida',
    words: ['Pizza', 'Hambúrguer', 'Sushi', 'Sorvete', 'Chocolate', 'Salada', 'Macarrão', 'Churrasco', 'Taco', 'Bolo']
  },
  {
    id: 'places',
    name: 'Lugares',
    words: ['Praia', 'Escola', 'Hospital', 'Cinema', 'Parque', 'Shopping', 'Aeroporto', 'Biblioteca', 'Academia', 'Restaurante']
  },
  {
    id: 'objects',
    name: 'Objetos',
    words: ['Cadeira', 'Mesa', 'Computador', 'Celular', 'Caneta', 'Relógio', 'Livro', 'Garrafa', 'Mochila', 'Óculos']
  },
  {
    id: 'jobs',
    name: 'Profissões',
    words: ['Médico', 'Professor', 'Policial', 'Bombeiro', 'Advogado', 'Engenheiro', 'Artista', 'Chef', 'Astronauta', 'Veterinário']
  }
];

// Simple beep sound using Web Audio API
export const playBeep = (context: AudioContext, timeLeft?: number) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  // Rising pitch effect for countdown
  // 5s: 880Hz
  // 4s: 980Hz
  // 3s: 1080Hz
  // 2s: 1180Hz
  // 1s: 1280Hz
  const baseFreq = 880;
  const freq = timeLeft ? baseFreq + ((5 - timeLeft) * 200) : baseFreq;

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(freq, context.currentTime);
  
  // More distinct "pip" sound
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.15);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.15);
};

export const playAlarm = (context: AudioContext) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(440, context.currentTime);
  
  gainNode.gain.setValueAtTime(0.1, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.001, context.currentTime + 0.5);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.5);
};
