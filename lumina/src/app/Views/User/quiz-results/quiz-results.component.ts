import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../Common/header/header.component';
import { QuizQuestion, QuizAnswer } from '../quiz-do/quiz-do.component';

@Component({
  selector: 'app-quiz-results',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './quiz-results.component.html',
  styleUrls: ['./quiz-results.component.scss']
})
export class QuizResultsComponent implements OnInit {
  // Data from query params
  folderId: number | null = null;
  folderName: string = '';
  totalQuestions: number = 0;
  correctCount: number = 0;
  score: number = 0;
  totalTimeSpent: number = 0;
  mode: string = '';
  
  // Parsed data
  answers: QuizAnswer[] = [];
  questions: QuizQuestion[] = [];
  
  // Display states
  showAllQuestions: boolean = false;
  filterType: 'all' | 'correct' | 'incorrect' = 'all';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadQuizResults();
  }

  loadQuizResults(): void {
    this.route.queryParams.subscribe(params => {
      this.folderId = params['folderId'] ? Number(params['folderId']) : null;
      this.folderName = params['folderName'] || '';
      this.totalQuestions = params['totalQuestions'] ? Number(params['totalQuestions']) : 0;
      this.correctCount = params['correctCount'] ? Number(params['correctCount']) : 0;
      this.score = params['score'] ? Number(params['score']) : 0;
      this.totalTimeSpent = params['totalTimeSpent'] ? Number(params['totalTimeSpent']) : 0;
      this.mode = params['mode'] || 'practice';

      // Parse JSON strings
      try {
        if (params['answers']) {
          this.answers = JSON.parse(params['answers']);
        }
        if (params['questions']) {
          this.questions = JSON.parse(params['questions']);
        }
      } catch (error) {
        console.error('Error parsing quiz results:', error);
      }

      // Validate data
      if (!this.folderId || this.totalQuestions === 0) {
        alert('Dữ liệu kết quả không hợp lệ!');
        this.goBack();
        return;
      }
    });
  }

  getIncorrectCount(): number {
    return this.totalQuestions - this.correctCount;
  }

  getPercentage(): number {
    return this.totalQuestions > 0 
      ? Math.round((this.correctCount / this.totalQuestions) * 100) 
      : 0;
  }

  getAverageTime(): number {
    return this.answers.length > 0
      ? Math.round(this.totalTimeSpent / this.answers.length)
      : 0;
  }

  formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} giây`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins} phút ${secs} giây` : `${mins} phút`;
  }

  getFilteredQuestions(): { question: QuizQuestion; answer: QuizAnswer | null; index: number }[] {
    let result = this.questions.map((q, index) => ({
      question: q,
      answer: this.answers[index] || null,
      index: index
    }));

    if (this.filterType === 'correct') {
      result = result.filter(item => item.answer?.isCorrect);
    } else if (this.filterType === 'incorrect') {
      result = result.filter(item => item.answer && !item.answer.isCorrect);
    }

    return result;
  }

  getWordsToReview(): QuizQuestion[] {
    return this.questions.filter((q, index) => {
      const answer = this.answers[index];
      return answer && !answer.isCorrect;
    });
  }

  getScoreColor(): string {
    if (this.score >= 80) return 'text-green-600';
    if (this.score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  getScoreBadge(): string {
    if (this.score >= 90) return 'Xuất sắc';
    if (this.score >= 80) return 'Tốt';
    if (this.score >= 70) return 'Khá';
    if (this.score >= 60) return 'Trung bình';
    return 'Cần cải thiện';
  }

  retryQuiz(): void {
    // Navigate back to quiz config detail with same folder
    this.router.navigate(['/quiz/config-detail'], {
      queryParams: {
        folderId: this.folderId,
        folderName: this.folderName,
        wordCount: this.totalQuestions
      }
    });
  }

  viewVocabulary(): void {
    // Navigate to vocabulary list detail
    if (this.folderId) {
      this.router.navigate(['/vocabulary/list', this.folderId]);
    }
  }

  goBack(): void {
    this.router.navigate(['/vocabulary']);
  }

  // Method phát âm - tương tự như vocabulary-list-detail
  playAudio(audioUrl?: string, word?: string): void {
    if (audioUrl) {
      // Nếu có audioUrl, phát audio từ URL
      const audio = new Audio(audioUrl);
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        // Nếu lỗi, fallback sang TTS
        this.speakWord(word);
      });
    } else if (word) {
      // Nếu không có audioUrl, dùng Text-to-Speech
      this.speakWord(word);
    }
  }

  // Hàm Text-to-Speech sử dụng Web Speech API
  private speakWord(word?: string): void {
    if (!word) return;

    // Kiểm tra browser có hỗ trợ Speech Synthesis không
    if ('speechSynthesis' in window) {
      // Dừng các audio đang phát (nếu có)
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US'; // Phát âm tiếng Anh
      utterance.rate = 0.9; // Tốc độ nói (0.1 - 10)
      utterance.pitch = 1; // Cao độ (0 - 2)

      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Browser không hỗ trợ Text-to-Speech');
    }
  }
}

