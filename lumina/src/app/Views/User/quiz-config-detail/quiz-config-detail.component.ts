import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent } from '../../Common/header/header.component';

@Component({
  selector: 'app-quiz-config-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './quiz-config-detail.component.html',
  styleUrls: ['./quiz-config-detail.component.scss']
})
export class QuizConfigDetailComponent implements OnInit {
  quizConfigForm: FormGroup;
  
  // Folder info từ query params
  folderId: number | null = null;
  folderName: string = '';
  wordCount: number = 0;

  // Options cho dropdowns
  questionCountOptions: number[] = [];
  
  // Time options
  timePerQuestionOptions = [
    { value: 0, label: 'Không giới hạn' },
    { value: 15, label: '15 giây/câu' },
    { value: 30, label: '30 giây/câu' },
    { value: 60, label: '60 giây/câu' },
    { value: 90, label: '90 giây/câu' }
  ];

  // Modes
  modes = [
    { value: 'practice', label: 'Practice', icon: 'fa-book', description: 'Xem đáp án ngay, không giới hạn thời gian' },
    { value: 'test', label: 'Test', icon: 'fa-clipboard-check', description: 'Chỉ xem kết quả sau khi hoàn thành, có giới hạn thời gian' },
    { value: 'challenge', label: 'Challenge', icon: 'fa-trophy', description: 'Chế độ khó hơn với dạng câu hỏi nghe và chọn đáp án' }
  ];

  // Question types
  questionTypes = [
    { value: 'word-to-meaning', label: 'Từ → Nghĩa', description: 'Hiển thị từ tiếng Anh, chọn nghĩa tiếng Việt' },
    { value: 'meaning-to-word', label: 'Nghĩa → Từ', description: 'Hiển thị nghĩa tiếng Việt, chọn từ tiếng Anh' },
    { value: 'mixed', label: 'Trộn', description: 'Hỗn hợp cả hai loại' }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.quizConfigForm = this.fb.group({
      mode: ['practice', Validators.required],
      questionCount: [10, Validators.required],
      timeMode: ['per-question', Validators.required], // 'none', 'per-question', 'total'
      timePerQuestion: [30],
      totalTime: [null], // minutes
      questionType: ['word-to-meaning', Validators.required],
      shuffleQuestions: [true],
      shuffleAnswers: [true],
      showExamples: [false]
    });
  }

  ngOnInit(): void {
    // Lấy query params
    this.route.queryParams.subscribe(params => {
      this.folderId = params['folderId'] ? Number(params['folderId']) : null;
      this.folderName = params['folderName'] || '';
      this.wordCount = params['wordCount'] ? Number(params['wordCount']) : 0;

      if (!this.folderId || !this.wordCount) {
        alert('Thông tin folder không hợp lệ!');
        this.goBack();
        return;
      }

      // Generate question count options
      this.generateQuestionCountOptions();

      // Set default question count
      const defaultCount = Math.min(10, this.wordCount);
      this.quizConfigForm.patchValue({
        questionCount: defaultCount
      });

      // Setup form validators và watchers
      this.setupFormWatchers();
    });
  }

  generateQuestionCountOptions(): void {
    const options: number[] = [];
    const maxCount = Math.min(30, this.wordCount);
    
    // Add common options
    if (this.wordCount >= 5) options.push(5);
    if (this.wordCount >= 10) options.push(10);
    if (this.wordCount >= 20) options.push(20);
    if (this.wordCount >= 30) options.push(30);
    
    // Add all option
    options.push(this.wordCount);
    
    // Sort and remove duplicates
    this.questionCountOptions = [...new Set(options)].sort((a, b) => a - b);
  }

  setupFormWatchers(): void {
    // Khi mode thay đổi, update time settings
    this.quizConfigForm.get('mode')?.valueChanges.subscribe(mode => {
      if (mode === 'practice') {
        // Practice mode: không giới hạn thời gian
        this.quizConfigForm.patchValue({
          timeMode: 'none',
          timePerQuestion: 0
        });
      } else {
        // Test/Challenge: mặc định 30s/câu
        this.quizConfigForm.patchValue({
          timeMode: 'per-question',
          timePerQuestion: 30
        });
      }
    });

    // Validate question count
    this.quizConfigForm.get('questionCount')?.valueChanges.subscribe(count => {
      if (count > this.wordCount) {
        this.quizConfigForm.patchValue({ questionCount: this.wordCount });
      }
    });

    // Validate total time
    this.quizConfigForm.get('totalTime')?.valueChanges.subscribe(time => {
      if (time && time < 1) {
        this.quizConfigForm.patchValue({ totalTime: 1 });
      }
    });
  }

  getEstimatedTime(): string {
    const mode = this.quizConfigForm.get('timeMode')?.value;
    const questionCount = this.quizConfigForm.get('questionCount')?.value || 0;
    
    if (mode === 'none') {
      return 'Không giới hạn';
    } else if (mode === 'per-question') {
      const timePerQuestion = this.quizConfigForm.get('timePerQuestion')?.value || 0;
      if (timePerQuestion === 0) return 'Không giới hạn';
      const totalSeconds = questionCount * timePerQuestion;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      if (minutes === 0) return `~${totalSeconds} giây`;
      return seconds > 0 ? `~${minutes} phút ${seconds} giây` : `~${minutes} phút`;
    } else if (mode === 'total') {
      const totalTime = this.quizConfigForm.get('totalTime')?.value || 0;
      return `~${totalTime} phút`;
    }
    return '';
  }

  getSelectedModeLabel(): string {
    const modeValue = this.quizConfigForm.get('mode')?.value;
    if (!modeValue) return '';
    const mode = this.modes.find(m => m.value === modeValue);
    return mode ? mode.label : '';
  }

  getSelectedQuestionTypeLabel(): string {
    const typeValue = this.quizConfigForm.get('questionType')?.value;
    if (!typeValue) return '';
    const type = this.questionTypes.find(t => t.value === typeValue);
    return type ? type.label : '';
  }

  getQuestionCount(): number {
    return this.quizConfigForm.get('questionCount')?.value || 0;
  }

  getCurrentMode(): string {
    return this.quizConfigForm.get('mode')?.value || '';
  }

  getCurrentQuestionType(): string {
    return this.quizConfigForm.get('questionType')?.value || '';
  }

  getCurrentTimeMode(): string {
    return this.quizConfigForm.get('timeMode')?.value || '';
  }

  isPracticeMode(): boolean {
    return this.getCurrentMode() === 'practice';
  }

  isPerQuestionTimeMode(): boolean {
    return this.getCurrentTimeMode() === 'per-question';
  }

  isTotalTimeMode(): boolean {
    return this.getCurrentTimeMode() === 'total';
  }

  startQuiz(): void {
    if (this.quizConfigForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.quizConfigForm.controls).forEach(key => {
        this.quizConfigForm.get(key)?.markAsTouched();
      });
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    const formValue = this.quizConfigForm.value;
    
    // Validate question count
    if (formValue.questionCount > this.wordCount) {
      alert(`Số câu hỏi không được vượt quá số từ trong folder (${this.wordCount} từ)!`);
      return;
    }

    // Validate total time nếu chọn mode total
    if (formValue.timeMode === 'total' && (!formValue.totalTime || formValue.totalTime < 1)) {
      alert('Vui lòng nhập tổng thời gian hợp lệ!');
      return;
    }

    // Navigate đến trang làm quiz với tất cả config
    const queryParams: any = {
      folderId: this.folderId,
      folderName: this.folderName,
      mode: formValue.mode,
      questionCount: formValue.questionCount,
      timeMode: formValue.timeMode,
      questionType: formValue.questionType,
      shuffleQuestions: formValue.shuffleQuestions,
      shuffleAnswers: formValue.shuffleAnswers,
      showExamples: formValue.showExamples
    };

    if (formValue.timeMode === 'per-question') {
      queryParams.timePerQuestion = formValue.timePerQuestion;
    } else if (formValue.timeMode === 'total') {
      queryParams.totalTime = formValue.totalTime;
    }

    this.router.navigate(['/quiz/do'], { queryParams });
  }

  goBack(): void {
    this.router.navigate(['/quiz/config']);
  }
}

