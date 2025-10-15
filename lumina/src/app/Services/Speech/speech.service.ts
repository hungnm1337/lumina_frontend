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

  /**
   * Phát âm một văn bản bằng tiếng Anh
   */
  speak(text: string, lang: string = 'en-US', rate: number = 0.9): void {
    if (!text || text.trim() === '') {
      return;
    }

    // Dừng phát âm hiện tại nếu có
    this.stop();

    // Tạo utterance mới
    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.lang = lang;
    this.currentUtterance.rate = rate; // Tốc độ đọc (0.1 - 10)
    this.currentUtterance.pitch = 1; // Cao độ (0 - 2)
    this.currentUtterance.volume = 1; // Âm lượng (0 - 1)

    // Lắng nghe sự kiện
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

  /**
   * Phát âm từ vựng tiếng Anh
   */
  speakWord(word: string): void {
    this.speak(word, 'en-US', 0.8);
  }

  /**
   * Phát âm câu ví dụ tiếng Anh
   */
  speakExample(example: string): void {
    this.speak(example, 'en-US', 0.9);
  }

  /**
   * Dừng phát âm hiện tại
   */
  stop(): void {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  /**
   * Tạm dừng phát âm
   */
  pause(): void {
    if (this.synth.speaking) {
      this.synth.pause();
    }
  }

  /**
   * Tiếp tục phát âm
   */
  resume(): void {
    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  /**
   * Kiểm tra xem có đang phát âm không
   */
  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  /**
   * Lấy danh sách các giọng nói có sẵn
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }

  /**
   * Phát âm với giọng nói cụ thể
   */
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

