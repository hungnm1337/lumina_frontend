import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../Views/Common/header/header.component';
import { VocabularyService } from '../../Services/Vocabulary/vocabulary.service';
import { SpacedRepetitionService, ReviewVocabularyRequest } from '../../Services/spaced-repetition/spaced-repetition.service';
import { VocabularyWord } from '../../Interfaces/vocabulary.interfaces';
import { interval, Subscription, forkJoin } from 'rxjs';

export interface ReviewQuizQuestion {
  id: number;
  word: string;
  definition: string;
  correctAnswer: string;
  options: string[];
  questionType: 'word-to-meaning' | 'meaning-to-word';
  vocabularyId: number;
  vocabularyListId: number;
  userSpacedRepetitionId?: number;
}

export interface ReviewQuizAnswer {
  questionId: number;
  vocabularyId: number;
  vocabularyListId: number;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

@Component({
  selector: 'app-review-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './review-quiz.component.html',
  styleUrls: ['./review-quiz.component.scss']
})
export class ReviewQuizComponent implements OnInit, OnDestroy {

  allWords: VocabularyWord[] = [];
  questions: ReviewQuizQuestion[] = [];
  currentQuestionIndex: number = 0;
  answers: ReviewQuizAnswer[] = [];
  selectedAnswer: string = '';
  

  timeRemaining: number = 30; 
  timerSubscription?: Subscription;
  isTimerRunning: boolean = false;
  

  isLoading: boolean = true;
  isFinished: boolean = false;
  questionStartTime: number = 0;
  

  correctCount: number = 0;
  incorrectCount: number = 0;
  wordIds: number[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private vocabularyService: VocabularyService,
    private spacedRepetitionService: SpacedRepetitionService
  ) {}

  ngOnInit(): void {
    this.loadQuizData();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  loadQuizData(): void {
    this.route.queryParams.subscribe(params => {
      const wordsParam = params['words'];
      if (!wordsParam) {
        alert('Không có từ vựng nào để review!');
        this.goBack();
        return;
      }

      this.wordIds = wordsParam.split(',').map((id: string) => Number(id)).filter((id: number) => !isNaN(id));
      
      if (this.wordIds.length === 0) {
        alert('Danh sách từ vựng không hợp lệ!');
        this.goBack();
        return;
      }

      this.loadVocabularies();
    });
  }

  loadVocabularies(): void {
    this.isLoading = true;
    
  
    this.spacedRepetitionService.getDueForReview().subscribe({
      next: (repetitions) => {
        const wordLevelRepetitions = repetitions.filter(r => 
          r.vocabularyId !== null && 
          r.vocabularyId !== undefined && 
          this.wordIds.includes(r.vocabularyId)
        );

        if (wordLevelRepetitions.length === 0) {
          alert('Không tìm thấy từ vựng cần review!');
          this.goBack();
          return;
        }

      
        const uniqueListIds = new Set<number>();
        const wordToRepetitionMap = new Map<number, any>();
        
        wordLevelRepetitions.forEach(rep => {
          if (rep.vocabularyListId) {
            uniqueListIds.add(rep.vocabularyListId);
          }
          if (rep.vocabularyId) {
            wordToRepetitionMap.set(rep.vocabularyId, rep);
          }
        });

        const vocabularyRequests = Array.from(uniqueListIds).map(listId => 
          this.vocabularyService.getVocabularies(listId)
        );

        forkJoin(vocabularyRequests).subscribe({
          next: (vocabulariesArrays) => {
            const wordsMap = new Map<number, VocabularyWord>();
            
            Array.from(uniqueListIds).forEach((listId, index) => {
              const vocabularies = vocabulariesArrays[index] || [];
              vocabularies.forEach(vocab => {
                if (vocab.id && this.wordIds.includes(vocab.id)) {
                  wordsMap.set(vocab.id, vocab);
                }
              });
            });

           
            this.allWords = Array.from(wordsMap.values()).filter(w => 
              w.id && this.wordIds.includes(w.id)
            );

            if (this.allWords.length === 0) {
              alert('Không tìm thấy từ vựng!');
              this.goBack();
              return;
            }

         
            this.generateQuestions(wordToRepetitionMap);
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error loading vocabularies:', error);
            alert('Không thể tải từ vựng. Vui lòng thử lại!');
            this.goBack();
          }
        });
      },
      error: (error) => {
        console.error('Error loading repetitions:', error);
        alert('Không thể tải thông tin review. Vui lòng thử lại!');
        this.goBack();
      }
    });
  }

  generateQuestions(wordToRepetitionMap: Map<number, any>): void {

    const shuffledWords = this.shuffleArray([...this.allWords]);
    

    this.questions = shuffledWords.map((word, index) => {
      const repetition = wordToRepetitionMap.get(word.id!);
      const questionType: 'word-to-meaning' | 'meaning-to-word' = index % 2 === 0 ? 'word-to-meaning' : 'meaning-to-word';
      
      return this.createQuestion(word, questionType, index, repetition);
    });

    this.startQuestion();
  }

  createQuestion(
    word: VocabularyWord, 
    questionType: 'word-to-meaning' | 'meaning-to-word', 
    index: number,
    repetition: any
  ): ReviewQuizQuestion {
    let correctAnswer: string;
    let wrongAnswers: string[];
    
    if (questionType === 'word-to-meaning') {
      correctAnswer = word.definition;
      wrongAnswers = this.getWrongAnswers(word, true);
    } else {
      correctAnswer = word.word;
      wrongAnswers = this.getWrongAnswers(word, false);
    }
    
    const allAnswers = [correctAnswer, ...wrongAnswers];
    const shuffledAnswers = this.shuffleArray([...allAnswers]);
    
    return {
      id: index + 1,
      word: word.word,
      definition: word.definition,
      correctAnswer: correctAnswer,
      options: shuffledAnswers,
      questionType: questionType,
      vocabularyId: word.id!,
      vocabularyListId: repetition?.vocabularyListId || 0,
      userSpacedRepetitionId: repetition?.userSpacedRepetitionId
    };
  }

  getWrongAnswers(correctWord: VocabularyWord, isWordToMeaning: boolean): string[] {
    const otherWords = this.allWords.filter(w => w.id !== correctWord.id);
    const shuffled = this.shuffleArray([...otherWords]);
    const wrongAnswers = shuffled.slice(0, 3);
    
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

  startQuestion(): void {
    this.questionStartTime = Date.now();
    this.selectedAnswer = '';
    this.timeRemaining = 30;
    this.startTimer();
  }

  startTimer(): void {
    this.stopTimer();
    this.isTimerRunning = true;
    
    this.timerSubscription = interval(1000).subscribe(() => {
      this.timeRemaining--;
      
      if (this.timeRemaining <= 0) {
        this.onTimeUp();
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
    this.submitAnswer('');
  }

  selectAnswer(answer: string): void {
    if (this.answers[this.currentQuestionIndex]) {
      return;
    }
    
    this.selectedAnswer = answer;
    this.submitAnswer(answer);
  }

  submitAnswer(answer?: string): void {
    const selected = answer || this.selectedAnswer;
    const question = this.questions[this.currentQuestionIndex];
    
    if (this.answers[this.currentQuestionIndex]) {
      return; 
    }
    
    const timeSpent = Math.floor((Date.now() - this.questionStartTime) / 1000);
    const isCorrect = selected === question.correctAnswer;
    
    const quizAnswer: ReviewQuizAnswer = {
      questionId: question.id,
      vocabularyId: question.vocabularyId,
      vocabularyListId: question.vocabularyListId,
      selectedAnswer: selected || '',
      correctAnswer: question.correctAnswer,
      isCorrect: isCorrect,
      timeSpent: timeSpent
    };
    
    this.answers[this.currentQuestionIndex] = quizAnswer;
    
    if (isCorrect) {
      this.correctCount++;
    } else {
      this.incorrectCount++;
    }
    
    this.updateSpacedRepetition(question, isCorrect, timeSpent);
    
 
    setTimeout(() => {
      if (this.currentQuestionIndex < this.questions.length - 1) {
        this.currentQuestionIndex++;
        this.startQuestion();
      } else {
        this.finishQuiz();
      }
    }, 1500); 
  }

  updateSpacedRepetition(question: ReviewQuizQuestion, isCorrect: boolean, timeSpent: number): void {

    let quality: number;
    
    if (!isCorrect) {
      quality = 0;  
    } else {
      
      if (timeSpent < 5) {
        quality = 5;  
      } else if (timeSpent < 15) {
        quality = 4; 
      } else {
        quality = 3;  
      }
    }
    
    const request: ReviewVocabularyRequest = {
      vocabularyId: question.vocabularyId,
      vocabularyListId: question.vocabularyListId,
      quality: quality
    };
    
    this.spacedRepetitionService.reviewVocabulary(request).subscribe({
      next: (response) => {
   
        console.log('Updated review status for word:', question.word);
      },
      error: (error) => {
        console.error('Error updating review status:', error);
      }
    });
  }

  finishQuiz(): void {
    this.stopTimer();
    this.isFinished = true;
  }

  goBack(): void {
    this.router.navigate(['/spaced-repetition/dashboard']);
  }

  getCurrentQuestion(): ReviewQuizQuestion | undefined {
    return this.questions[this.currentQuestionIndex];
  }

  getCurrentAnswer(): ReviewQuizAnswer | undefined {
    return this.answers[this.currentQuestionIndex];
  }

  getProgress(): number {
    return this.questions.length > 0 
      ? Math.round(((this.currentQuestionIndex + 1) / this.questions.length) * 100)
      : 0;
  }

  getScore(): number {
    return this.questions.length > 0
      ? Math.round((this.correctCount / this.questions.length) * 100)
      : 0;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

