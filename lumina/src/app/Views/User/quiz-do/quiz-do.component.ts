import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../Common/header/header.component';
import { VocabularyService } from '../../../Services/Vocabulary/vocabulary.service';
import { VocabularyWord } from '../../../Interfaces/vocabulary.interfaces';
import { interval, Subscription } from 'rxjs';

export interface QuizQuestion {
  id: number;
  word: string;
  definition: string;
  correctAnswer: string;
  options: string[];
  questionType: 'word-to-meaning' | 'meaning-to-word' | 'listening';
  example?: string;
  vocabularyId: number;
  audioUrl?: string;
}

export interface QuizAnswer {
  questionId: number;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number; // seconds
}

@Component({
  selector: 'app-quiz-do',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './quiz-do.component.html',
  styleUrls: ['./quiz-do.component.scss']
})
export class QuizDoComponent implements OnInit, OnDestroy {
  // Quiz config từ query params
  folderId: number | null = null;
  folderName: string = '';
  mode: string = 'practice';
  questionCount: number = 10;
  timeMode: string = 'per-question';
  timePerQuestion: number = 30;
  totalTime: number = 0;
  questionType: string = 'word-to-meaning';
  shuffleQuestions: boolean = true;
  shuffleAnswers: boolean = true;
  showExamples: boolean = false;

  // Quiz state
  allWords: VocabularyWord[] = [];
  questions: QuizQuestion[] = [];
  currentQuestionIndex: number = 0;
  answers: QuizAnswer[] = [];
  selectedAnswer: string = '';
  selectedAnswersByIndex: Map<number, string> = new Map(); // Lưu selectedAnswer cho mỗi câu hỏi
  
  // Timer
  timeRemaining: number = 0;
  timerSubscription?: Subscription;
  isTimerRunning: boolean = false;
  totalTimeRemaining: number = 0; // For total time mode
  
  // State
  isLoading: boolean = true;
  isFinished: boolean = false;
  startTime: number = 0;
  questionStartTime: number = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private vocabularyService: VocabularyService
  ) {}

  ngOnInit(): void {
    this.loadQuizConfig();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  loadQuizConfig(): void {
    this.route.queryParams.subscribe(params => {
      this.folderId = params['folderId'] ? Number(params['folderId']) : null;
      this.folderName = params['folderName'] || '';
      this.mode = params['mode'] || 'practice';
      this.questionCount = params['questionCount'] ? Number(params['questionCount']) : 10;
      this.timeMode = params['timeMode'] || 'per-question';
      this.timePerQuestion = params['timePerQuestion'] ? Number(params['timePerQuestion']) : 30;
      this.totalTime = params['totalTime'] ? Number(params['totalTime']) : 0;
      this.questionType = params['questionType'] || 'word-to-meaning';
      this.shuffleQuestions = params['shuffleQuestions'] === 'true';
      this.shuffleAnswers = params['shuffleAnswers'] === 'true';
      this.showExamples = params['showExamples'] === 'true';

      if (!this.folderId) {
        alert('Thông tin folder không hợp lệ!');
        this.goBack();
        return;
      }

      this.loadVocabularies();
    });
  }

  loadVocabularies(): void {
    this.isLoading = true;
    this.vocabularyService.getVocabularies(this.folderId || undefined).subscribe({
      next: (words) => {
        if (!words || words.length === 0) {
          alert('Folder này không có từ vựng nào!');
          this.goBack();
          return;
        }

        this.allWords = words;
        this.generateQuestions();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading vocabularies:', error);
        alert('Không thể tải từ vựng. Vui lòng thử lại!');
        this.goBack();
      }
    });
  }

  generateQuestions(): void {
    // Select words for quiz
    let selectedWords = [...this.allWords];
    
    if (this.shuffleQuestions) {
      selectedWords = this.shuffleArray([...selectedWords]);
    }

    selectedWords = selectedWords.slice(0, Math.min(this.questionCount, selectedWords.length));

    // Generate questions
    this.questions = selectedWords.map((word, index) => {
      let questionType: 'word-to-meaning' | 'meaning-to-word' | 'listening';
      
      // Challenge Mode: Mix các loại câu hỏi bao gồm listening
      if (this.mode === 'challenge') {
        // Chia đều: 1/3 word-to-meaning, 1/3 meaning-to-word, 1/3 listening
        const mod = index % 3;
        if (mod === 0) {
          questionType = 'word-to-meaning';
        } else if (mod === 1) {
          questionType = 'meaning-to-word';
        } else {
          questionType = 'listening';
        }
      } else {
        // Các mode khác: giữ logic cũ
        if (this.questionType === 'word-to-meaning') {
          questionType = 'word-to-meaning';
        } else if (this.questionType === 'meaning-to-word') {
          questionType = 'meaning-to-word';
        } else if (this.questionType === 'mixed') {
          questionType = index % 2 === 0 ? 'word-to-meaning' : 'meaning-to-word';
        } else {
          questionType = 'word-to-meaning'; // default
        }
      }
      
      return this.createQuestion(word, questionType, index);
    });

    // Initialize timer
    this.initializeTimer();
    this.startQuestion();
  }

  createQuestion(word: VocabularyWord, questionType: 'word-to-meaning' | 'meaning-to-word' | 'listening', index: number): QuizQuestion {
    let correctAnswer: string;
    let wrongAnswers: string[];
    
    if (questionType === 'listening') {
      // Listening: Nghe và chọn nghĩa tiếng Việt
      correctAnswer = word.definition;
      wrongAnswers = this.getWrongAnswers(word, true); // Lấy definitions của các từ khác
    } else if (questionType === 'word-to-meaning') {
      correctAnswer = word.definition;
      wrongAnswers = this.getWrongAnswers(word, true);
    } else {
      // meaning-to-word
      correctAnswer = word.word;
      wrongAnswers = this.getWrongAnswers(word, false);
    }
    
    // Combine correct and wrong answers
    const allAnswers = [correctAnswer, ...wrongAnswers];
    
    // Shuffle answers if enabled
    const shuffledAnswers = this.shuffleAnswers 
      ? this.shuffleArray([...allAnswers])
      : allAnswers;
    
    return {
      id: index + 1,
      word: word.word,
      definition: word.definition,
      correctAnswer: correctAnswer,
      options: shuffledAnswers,
      questionType: questionType,
      example: word.example,
      vocabularyId: word.id,
      audioUrl: word.audioUrl // Thêm audioUrl cho listening questions
    };
  }

  getWrongAnswers(correctWord: VocabularyWord, isWordToMeaning: boolean): string[] {
    const otherWords = this.allWords.filter(w => w.id !== correctWord.id);
    const shuffled = this.shuffleArray([...otherWords]);
    const wrongAnswers = shuffled.slice(0, 3); // Get 3 wrong answers
    
    return wrongAnswers.map(w => isWordToMeaning ? w.definition : w.word);
  }

  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  initializeTimer(): void {
    if (this.timeMode === 'total') {
      this.totalTimeRemaining = this.totalTime * 60; // Convert to seconds
    } else if (this.timeMode === 'per-question') {
      this.timeRemaining = this.timePerQuestion;
    } else {
      this.timeRemaining = 0; // No limit
    }
  }

  startQuestion(): void {
    this.questionStartTime = Date.now();
    
    // Load selectedAnswer từ Map nếu có (cho câu hỏi này)
    const savedAnswer = this.selectedAnswersByIndex.get(this.currentQuestionIndex);
    if (savedAnswer) {
      this.selectedAnswer = savedAnswer;
    } else if (!this.answers[this.currentQuestionIndex]) {
      // Chỉ reset nếu chưa có answer và chưa có saved answer
      this.selectedAnswer = '';
    }
    
    if (this.timeMode === 'per-question') {
      this.timeRemaining = this.timePerQuestion;
      this.startTimer();
    } else if (this.timeMode === 'total' && !this.isTimerRunning) {
      this.startTotalTimer();
    }
  }

  startTimer(): void {
    if (this.timeRemaining <= 0) return;
    
    this.stopTimer();
    this.isTimerRunning = true;
    
    this.timerSubscription = interval(1000).subscribe(() => {
      this.timeRemaining--;
      
      if (this.timeRemaining <= 0) {
        this.onTimeUp();
      }
    });
  }

  startTotalTimer(): void {
    this.stopTimer();
    this.isTimerRunning = true;
    
    this.timerSubscription = interval(1000).subscribe(() => {
      this.totalTimeRemaining--;
      
      if (this.totalTimeRemaining <= 0) {
        this.finishQuiz();
      }
    });
  }

  stopTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = undefined;
    }
    this.isTimerRunning = false;
  }

  onTimeUp(): void {
    this.stopTimer();
    
    if (this.mode === 'practice') {
      // In practice mode, show correct answer but don't auto-submit
      // User can still select answer
    } else {
      // Auto submit empty answer
      this.submitAnswer('');
    }
  }

  selectAnswer(answer: string): void {
    // Không cho chọn lại nếu đã có đáp án cho câu hỏi này
    if (this.getCurrentAnswer()) {
      return;
    }
    
    this.selectedAnswer = answer;
    // Lưu selectedAnswer cho câu hỏi hiện tại
    this.selectedAnswersByIndex.set(this.currentQuestionIndex, answer);
    
    // In practice mode, auto-submit immediately after selecting to disable options
    // But still show feedback box
    if (this.mode === 'practice') {
      this.submitAnswer(answer);
    }
  }

  submitAnswer(answer?: string, skipNavigation: boolean = false): void {
    const selected = answer || this.selectedAnswer;
    const question = this.questions[this.currentQuestionIndex];
    
    // In test/challenge mode, require answer (trừ khi skipNavigation = true)
    if (!skipNavigation && (this.mode === 'test' || this.mode === 'challenge') && !selected) {
      return;
    }
    
    // Kiểm tra xem đã có answer cho câu hỏi này chưa
    if (this.answers[this.currentQuestionIndex]) {
      return; // Đã submit rồi, không submit lại
    }
    
    // Lưu selectedAnswer vào Map
    if (selected) {
      this.selectedAnswersByIndex.set(this.currentQuestionIndex, selected);
    }
    
    const timeSpent = Math.floor((Date.now() - this.questionStartTime) / 1000);
    
    const quizAnswer: QuizAnswer = {
      questionId: question.id,
      selectedAnswer: selected || '',
      correctAnswer: question.correctAnswer,
      isCorrect: selected === question.correctAnswer,
      timeSpent: timeSpent
    };

    // Đảm bảo answers array có đủ phần tử
    while (this.answers.length <= this.currentQuestionIndex) {
      this.answers.push({} as QuizAnswer);
    }
    
    this.answers[this.currentQuestionIndex] = quizAnswer;
    this.stopTimer();

    // Nếu skipNavigation = true, không chuyển câu (dùng khi finish quiz)
    if (skipNavigation) {
      return;
    }

    // Trong practice mode, không tự động chuyển câu, chỉ submit và disable options
    // Trong test/challenge mode, tự động chuyển câu
    if (this.mode === 'practice') {
      // Không chuyển câu, chỉ submit để disable options
      return;
    }

    // Move to next question or finish (for test/challenge mode)
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.startQuestion();
    } else {
      this.finishQuiz();
    }
  }

  nextQuestion(): void {
    // Lưu selectedAnswer hiện tại vào Map trước khi chuyển câu
    if (this.selectedAnswer) {
      this.selectedAnswersByIndex.set(this.currentQuestionIndex, this.selectedAnswer);
    }
    
    // In test/challenge mode, require answer before moving
    if ((this.mode === 'test' || this.mode === 'challenge') && !this.selectedAnswer && !this.getCurrentAnswer()) {
      return;
    }
    
    // Trong practice mode, nếu chưa submit thì submit trước
    if (this.mode === 'practice' && !this.getCurrentAnswer() && this.selectedAnswer) {
      this.submitAnswer(this.selectedAnswer);
    }
    
    if (this.currentQuestionIndex < this.questions.length - 1) {
      // Chuyển sang câu tiếp theo
      this.currentQuestionIndex++;
      this.startQuestion();
    } else {
      // Nếu là câu cuối và chưa submit, submit trước
      if (this.mode === 'practice' && !this.getCurrentAnswer() && this.selectedAnswer) {
        this.submitAnswer(this.selectedAnswer);
      }
      this.finishQuiz();
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      // Lưu selectedAnswer hiện tại vào Map trước khi chuyển câu
      if (this.selectedAnswer) {
        this.selectedAnswersByIndex.set(this.currentQuestionIndex, this.selectedAnswer);
      }
      
      this.stopTimer();
      this.currentQuestionIndex--;
      
      // Load previous answer if exists
      const previousAnswer = this.answers[this.currentQuestionIndex];
      if (previousAnswer) {
        this.selectedAnswer = previousAnswer.selectedAnswer;
      } else {
        // Load từ Map nếu có
        const savedAnswer = this.selectedAnswersByIndex.get(this.currentQuestionIndex);
        this.selectedAnswer = savedAnswer || '';
      }
      
      this.startQuestion();
    }
  }

  finishQuiz(): void {
    this.stopTimer();
    
    // Lưu selectedAnswer hiện tại vào Map trước khi submit tất cả
    if (this.selectedAnswer) {
      this.selectedAnswersByIndex.set(this.currentQuestionIndex, this.selectedAnswer);
    }
    
    // Submit tất cả các câu hỏi chưa được submit
    // Đảm bảo mỗi câu đều có answer (kể cả empty)
    for (let i = 0; i < this.questions.length; i++) {
      if (!this.answers[i] || !this.answers[i].questionId) {
        const question = this.questions[i];
        
        // Lấy selectedAnswer từ Map hoặc từ câu hiện tại
        const selected = this.selectedAnswersByIndex.get(i) || 
                        (i === this.currentQuestionIndex ? this.selectedAnswer : '');
        
        // Tính thời gian - nếu là câu hiện tại, dùng questionStartTime
        // Nếu không, giả sử 0 giây (vì không có record)
        const timeSpent = (i === this.currentQuestionIndex)
          ? Math.floor((Date.now() - this.questionStartTime) / 1000)
          : 0;
        
        const quizAnswer: QuizAnswer = {
          questionId: question.id,
          selectedAnswer: selected,
          correctAnswer: question.correctAnswer,
          isCorrect: selected === question.correctAnswer,
          timeSpent: timeSpent
        };

        // Đảm bảo answers array có đủ phần tử
        while (this.answers.length <= i) {
          this.answers.push({} as QuizAnswer);
        }
        
        this.answers[i] = quizAnswer;
      }
    }

    this.isFinished = true;

    // Calculate score - chỉ tính các answer hợp lệ (có questionId)
    const validAnswers = this.answers.filter(a => a && a.questionId);
    const correctCount = validAnswers.filter(a => a.isCorrect).length;
    const totalQuestions = this.questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const totalTimeSpent = validAnswers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);

    // Navigate to results page
    this.router.navigate(['/quiz/results'], {
      queryParams: {
        folderId: this.folderId,
        folderName: this.folderName,
        totalQuestions: totalQuestions,
        correctCount: correctCount,
        score: score,
        totalTimeSpent: totalTimeSpent,
        mode: this.mode,
        answers: JSON.stringify(validAnswers),
        questions: JSON.stringify(this.questions)
      }
    });
  }

  getCurrentQuestion(): QuizQuestion | null {
    return this.questions[this.currentQuestionIndex] || null;
  }

  getProgress(): number {
    return this.questions.length > 0 
      ? Math.round(((this.currentQuestionIndex + 1) / this.questions.length) * 100)
      : 0;
  }

  getCurrentAnswer(): QuizAnswer | null {
    return this.answers[this.currentQuestionIndex] || null;
  }

  isAnswerCorrect(answer: string): boolean {
    const question = this.getCurrentQuestion();
    return question ? answer === question.correctAnswer : false;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  }

  goBack(): void {
    if (confirm('Bạn có chắc muốn thoát? Tiến độ sẽ không được lưu.')) {
      this.router.navigate(['/quiz/config']);
    }
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

