import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CATEGORIES } from "../data/categories";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { CATEGORIES };

// Simple beep sound using Web Audio API
export const playBeep = (context: AudioContext, timeLeft?: number) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  // Sharper, more urgent beep
  // Rising pitch effect for countdown
  const baseFreq = 880;
  const freq = timeLeft ? baseFreq + ((5 - timeLeft) * 300) : baseFreq;

  oscillator.type = 'square'; // Changed to square for more "bite"
  oscillator.frequency.setValueAtTime(freq, context.currentTime);
  
  // Louder, shorter envelope
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.1);
};

export const playAlarm = (context: AudioContext) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const lfo = context.createOscillator(); // Low Frequency Oscillator for siren effect

  lfo.connect(oscillator.frequency);
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  // Siren effect
  oscillator.type = 'sawtooth'; // Sawtooth is very harsh/loud
  oscillator.frequency.setValueAtTime(600, context.currentTime);
  
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(8, context.currentTime); // 8Hz wobble
  lfo.start();

  // Volume envelope
  gainNode.gain.setValueAtTime(0.5, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 1.5);
  gainNode.gain.linearRampToValueAtTime(0.001, context.currentTime + 2.0);

  oscillator.start();
  oscillator.stop(context.currentTime + 2.0);
  lfo.stop(context.currentTime + 2.0);
};
