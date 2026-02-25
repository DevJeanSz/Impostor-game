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
export const playBeep = (context: AudioContext) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, context.currentTime); // A5
  oscillator.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.1); 
  
  gainNode.gain.setValueAtTime(0.1, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.1);
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
