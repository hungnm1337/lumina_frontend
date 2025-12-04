import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  
  speak(text: string, lang: string = 'en-US', rate: number = 0.9): void {
    if (!text || text.trim() === '') {
      return;
    }

    this.stop();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.lang = lang;
    this.currentUtterance.rate = rate; // Tốc độ đọc (0.1 - 10)
    this.currentUtterance.pitch = 1; // Cao độ (0 - 2)
    this.currentUtterance.volume = 1; // Âm lượng (0 - 1)

    this.currentUtterance.onstart = () => {
      console.log('Bắt đầu phát âm:', text);
    };

    this.currentUtterance.onend = () => {
      console.log('Kết thúc phát âm');
      this.currentUtterance = null;
    };

    this.currentUtterance.onerror = (event) => {
      console.error('Lỗi phát âm:', event);
      this.currentUtterance = null;
    };

    // Phát âm
    this.synth.speak(this.currentUtterance);
  }

  
  speakWord(word: string): void {
    this.speak(word, 'en-US', 0.8);
  }

  
  speakExample(example: string): void {
    this.speak(example, 'en-US', 0.9);
  }

  
  stop(): void {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  
  pause(): void {
    if (this.synth.speaking) {
      this.synth.pause();
    }
  }

  
  resume(): void {
    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  
  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  
  getVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }

  
  speakWithVoice(text: string, voiceName: string): void {
    const voices = this.getVoices();
    const voice = voices.find(v => v.name === voiceName);

    if (voice) {
      this.stop();
      this.currentUtterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance.voice = voice;
      this.currentUtterance.rate = 0.9;
      this.synth.speak(this.currentUtterance);
    } else {
      this.speak(text);
    }
  }
}

