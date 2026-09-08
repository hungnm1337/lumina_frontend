import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export type ExamStep = 'preview' | 'instructions' | 'exam' | 'summary';
export type SpeakingPhase = 'prompt' | 'preparation' | 'recording' | 'completed';

export interface SpeakingQuestion {
  questionNumber: number;
  prompt: string;
  imageUrl?: string;
  secondImageUrl?: string;
  prepTime: number; // seconds
  recordTime: number; // seconds
}

export interface SpeakingPart {
  partIndex: number;
  partTotal: number;
  partTitle: string;
  questions: SpeakingQuestion[];
}

@Component({
  selector: 'app-aptis-speaking-exam',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aptis-speaking-exam.component.html',
  styleUrls: ['./aptis-speaking-exam.component.scss']
})
export class AptisSpeakingExamComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentStep: ExamStep = 'preview';
  isTransitioning = false;
  isFullscreen = false;

  // Question structure matching TestReach Aptis General
  parts: SpeakingPart[] = [
    {
      partIndex: 1,
      partTotal: 3,
      partTitle: 'Personal Information',
      questions: [
        {
          questionNumber: 1,
          prompt: 'Please tell me about your family.',
          prepTime: 5,
          recordTime: 30
        },
        {
          questionNumber: 2,
          prompt: 'What do you like doing in your free time?',
          prepTime: 5,
          recordTime: 30
        },
        {
          questionNumber: 3,
          prompt: 'Tell me about your hometown or the place where you live.',
          prepTime: 5,
          recordTime: 30
        }
      ]
    },
    {
      partIndex: 2,
      partTotal: 3,
      partTitle: 'Describe, Express Opinion and Provide Reasons and Explanations',
      questions: [
        {
          questionNumber: 1,
          prompt: 'Describe this picture.',
          imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
          prepTime: 10,
          recordTime: 45
        },
        {
          questionNumber: 2,
          prompt: 'Tell me about a time you cooked or shared a meal with your family.',
          imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
          prepTime: 5,
          recordTime: 45
        },
        {
          questionNumber: 3,
          prompt: 'Why do you think eating together as a family is important?',
          imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
          prepTime: 5,
          recordTime: 45
        }
      ]
    },
    {
      partIndex: 3,
      partTotal: 3,
      partTitle: 'Describe, Compare and Provide Reasons and Explanations',
      questions: [
        {
          questionNumber: 1,
          prompt: 'Compare these two pictures.',
          imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
          secondImageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80',
          prepTime: 10,
          recordTime: 45
        },
        {
          questionNumber: 2,
          prompt: 'Which of these two activities would you prefer to do, and why?',
          imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
          secondImageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80',
          prepTime: 5,
          recordTime: 45
        },
        {
          questionNumber: 3,
          prompt: 'How important is regular exercise for people living in big cities?',
          imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
          secondImageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80',
          prepTime: 5,
          recordTime: 45
        }
      ]
    }
  ];

  currentPartIndex = 0;
  currentQuestionIndex = 0;

  // Active speaking phase
  currentPhase: SpeakingPhase = 'prompt';
  countdownTimer: number = 0;
  private intervalRef: any = null;

  // Media recording
  mediaStream: MediaStream | null = null;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  recordedAudioUrl: string | null = null;
  isMicActive: boolean = false;

  // Drawers & Modals
  showMenuDrawer: boolean = false;
  showInfoModal: boolean = false;
  showAccessibilityModal: boolean = false;
  contrastMode: 'normal' | 'high' = 'normal';
  fontSize: 'normal' | 'large' = 'normal';

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.stopTimers();
    this.stopMicrophone();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  get currentPart(): SpeakingPart {
    return this.parts[this.currentPartIndex];
  }

  get currentQuestion(): SpeakingQuestion {
    return this.currentPart.questions[this.currentQuestionIndex];
  }

  /**
   * Bắt đầu làm bài từ Preview sang Instructions
   */
  startAssessment(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    setTimeout(() => {
      this.currentStep = 'instructions';
      this.isTransitioning = false;
      this.cdr.detectChanges();
    }, 400);
  }

  /**
   * Chuyển từ Instructions sang làm bài thực tế (Image 4)
   */
  nextStep(): void {
    if (this.currentStep === 'instructions') {
      this.isTransitioning = true;
      setTimeout(() => {
        this.currentStep = 'exam';
        this.isTransitioning = false;
        this.initQuestionFlow();
        this.cdr.detectChanges();
      }, 400);
    } else if (this.currentStep === 'exam') {
      this.advanceToNextQuestion();
    }
  }

  /**
   * Khởi chạy luồng câu hỏi (Phát âm Prompt -> Đếm ngược Chuẩn bị -> Đếm ngược Ghi âm)
   */
  initQuestionFlow(): void {
    this.stopTimers();
    this.recordedAudioUrl = null;
    this.currentPhase = 'prompt';

    // Bật mic để Chrome hiển thị banner "Micrô đang được sử dụng"
    this.requestMicrophone();

    // Đọc câu hỏi qua SpeechSynthesis
    this.playAudioPrompt(this.currentQuestion.prompt, () => {
      this.startPreparationPhase();
    });
  }

  /**
   * Phát âm câu hỏi tiếng Anh
   */
  playAudioPrompt(text: string, onEndCallback: () => void): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB'; // British English for Aptis
      utterance.rate = 0.95;
      utterance.onend = () => {
        onEndCallback();
      };
      utterance.onerror = () => {
        onEndCallback();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        onEndCallback();
      }, 3000);
    }
  }

  /**
   * Bắt đầu thời gian chuẩn bị
   */
  startPreparationPhase(): void {
    this.currentPhase = 'preparation';
    this.countdownTimer = this.currentQuestion.prepTime;
    this.cdr.detectChanges();

    this.intervalRef = setInterval(() => {
      this.countdownTimer--;
      if (this.countdownTimer <= 0) {
        clearInterval(this.intervalRef);
        this.playBeepAndStartRecording();
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  /**
   * Phát tiếng beep và bắt đầu ghi âm
   */
  playBeepAndStartRecording(): void {
    this.playSignalBeep();
    this.startRecordingPhase();
  }

  playSignalBeep(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880; // A5 note
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
      }, 250);
    } catch (e) {}
  }

  /**
   * Bắt đầu giai đoạn ghi âm
   */
  startRecordingPhase(): void {
    this.currentPhase = 'recording';
    this.countdownTimer = this.currentQuestion.recordTime;
    this.startMediaRecorder();
    this.cdr.detectChanges();

    this.intervalRef = setInterval(() => {
      this.countdownTimer--;
      if (this.countdownTimer <= 0) {
        clearInterval(this.intervalRef);
        this.stopRecordingPhase();
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  /**
   * Kết thúc ghi âm câu hỏi hiện tại
   */
  stopRecordingPhase(): void {
    this.stopMediaRecorder();
    this.currentPhase = 'completed';
    this.cdr.detectChanges();
  }

  /**
   * Chuyển sang câu hỏi tiếp theo
   */
  advanceToNextQuestion(): void {
    this.stopTimers();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Next question in current part
    if (this.currentQuestionIndex < this.currentPart.questions.length - 1) {
      this.currentQuestionIndex++;
      this.initQuestionFlow();
    } else {
      // Next part
      if (this.currentPartIndex < this.parts.length - 1) {
        this.currentPartIndex++;
        this.currentQuestionIndex = 0;
        this.initQuestionFlow();
      } else {
        // Complete whole exam
        this.currentStep = 'summary';
      }
    }
  }

  // MediaRecorder Helpers
  private requestMicrophone(): void {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          this.mediaStream = stream;
          this.isMicActive = true;
          this.cdr.detectChanges();
        })
        .catch(err => {
          console.warn('Microphone permission request:', err);
        });
    }
  }

  private startMediaRecorder(): void {
    if (!this.mediaStream) return;
    try {
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.recordedAudioUrl = URL.createObjectURL(audioBlob);
        this.cdr.detectChanges();
      };
      this.mediaRecorder.start();
    } catch (e) {
      console.warn('Failed to start MediaRecorder:', e);
    }
  }

  private stopMediaRecorder(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
  }

  private stopMicrophone(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
      this.isMicActive = false;
    }
  }

  private stopTimers(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  // Utility Controls
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      this.isFullscreen = false;
    }
  }

  toggleMenuDrawer(): void {
    this.showMenuDrawer = !this.showMenuDrawer;
  }

  toggleInfoModal(): void {
    this.showInfoModal = !this.showInfoModal;
  }

  toggleAccessibilityModal(): void {
    this.showAccessibilityModal = !this.showAccessibilityModal;
  }

  selectQuestion(partIdx: number, qIdx: number): void {
    this.currentPartIndex = partIdx;
    this.currentQuestionIndex = qIdx;
    this.showMenuDrawer = false;
    this.initQuestionFlow();
  }

  backToPrepare(): void {
    this.stopTimers();
    this.stopMicrophone();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.router.navigate(['/aptis/prepare-general']);
  }
}

