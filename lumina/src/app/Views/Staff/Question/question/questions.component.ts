import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';

interface TOEICQuestion {
  id: string;
  skill: 'Listening' | 'Reading' | 'Speaking' | 'Writing';
  part: string;
  title?: string;
  description?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionType: 'multiple-choice' | 'multiple-answer' | 'true-false' | 'essay';
  questionText: string;
  options?: string[];
  correctAnswer?: number | number[]; // Single number or array for multiple answers
  explanation: string;
  sampleAnswer?: string;
  audioFile?: string;
  imageFile?: string;
  duration?: number;
  createdDate: string;
  createdBy: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
}

interface QuestionStats {
  listening: number;
  reading: number;
  speaking: number;
  writing: number;
  total: number;
}

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './questions.component.html',
  styleUrls: ['./questions.component.scss']
})
export class QuestionsComponent implements OnInit {

  /* ---------- STATE ---------- */
  questions: TOEICQuestion[] = [];
  filteredQuestions: TOEICQuestion[] = [];

  /* ---------- FILTER STATE ---------- */
  searchTerm = '';
  selectedSkill = '';
  selectedPart = '';
  selectedDifficulty = '';
  selectedStatus = '';

  /* ---------- MODAL STATE ---------- */
  isModalOpen = false;
  editingQuestion: TOEICQuestion | null = null;
  questionForm: FormGroup;

  /* ---------- STATIC DATA ---------- */
  skills = ['Listening', 'Reading', 'Speaking', 'Writing'];
  
  listeningParts = [
    'Part 1 - Photographs',
    'Part 2 - Question-Response', 
    'Part 3 - Conversations',
    'Part 4 - Short Talks'
  ];
  
  readingParts = [
    'Part 5 - Incomplete Sentences',
    'Part 6 - Text Completion',
    'Part 7 - Reading Comprehension'
  ];
  
  speakingParts = [
    'Task 1 - Read a text aloud',
    'Task 2 - Describe a picture',
    'Task 3 - Respond to questions'
  ];
  
  writingParts = [
    'Task 1 - Write a sentence based on a picture',
    'Task 2 - Respond to a written request',
    'Task 3 - Write an opinion essay'
  ];

  difficulties = [
    { value: 'Easy', label: '🟢 Dễ', emoji: '🟢' },
    { value: 'Medium', label: '🟡 Trung bình', emoji: '🟡' },
    { value: 'Hard', label: '🔴 Khó', emoji: '🔴' }
  ];

  questionTypes = [
    { value: 'multiple-choice', label: 'Trắc nghiệm 1 đáp án' },
    { value: 'multiple-answer', label: 'Trắc nghiệm nhiều đáp án' },
    { value: 'true-false', label: 'Đúng/Sai' },
    { value: 'essay', label: 'Tự luận' }
  ];

  statusOptions = ['draft', 'published', 'archived'];

  constructor(private fb: FormBuilder, private router: Router) {
    this.questionForm = this.fb.group({
      skill: ['', Validators.required],
      part: ['', Validators.required],
      title: [''],
      duration: [''],
      difficulty: ['Medium', Validators.required],
      questionType: ['multiple-choice', Validators.required],
      questionText: ['', [Validators.required, Validators.minLength(5)]],
      options: this.fb.array([]),
      correctAnswer: [0],
      correctAnswers: this.fb.array([]), // For multiple-answer questions
      explanation: ['', [Validators.required, Validators.minLength(10)]],
      sampleAnswer: [''],
      audioFile: [''],
      imageFile: [''],
      tags: ['']
    });
  }

  /* ---------- LIFECYCLE ---------- */
  ngOnInit(): void {
    this.loadSampleData();
    this.filterQuestions();
    this.initializeOptionsArray();
    
    // Watch for question type changes
    this.questionForm.get('questionType')?.valueChanges.subscribe(type => {
      this.onQuestionTypeChange(type);
    });
  }

  /* ---------- FORM ARRAY HELPERS ---------- */
  get options(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }

  get correctAnswers(): FormArray {
    return this.questionForm.get('correctAnswers') as FormArray;
  }

  /* ---------- CUSTOM VALIDATORS ---------- */
  atLeastOneCheckedValidator = (control: FormArray): {[key: string]: boolean} | null => {
    const hasChecked = control.controls.some(ctrl => ctrl.value === true);
    return hasChecked ? null : { 'atLeastOneRequired': true };
  };

  /* ---------- QUESTION TYPE LOGIC ---------- */
  onQuestionTypeChange(type: string): void {
    const optionsArray = this.options;
    const correctAnswersArray = this.correctAnswers;
    
    // Clear existing options and correct answers
    while (optionsArray.length !== 0) {
      optionsArray.removeAt(0);
    }
    while (correctAnswersArray.length !== 0) {
      correctAnswersArray.removeAt(0);
    }
    
    switch (type) {
      case 'multiple-choice':
        for (let i = 0; i < 4; i++) {
          this.addOption();
        }
        this.questionForm.get('correctAnswer')?.setValidators([Validators.required]);
        this.questionForm.get('correctAnswer')?.setValue(0);
        this.questionForm.get('sampleAnswer')?.clearValidators();
        this.correctAnswers.clearValidators();
        break;
        
      case 'multiple-answer':
        for (let i = 0; i < 4; i++) {
          this.addOption();
          this.correctAnswers.push(this.fb.control(false));
        }
        this.questionForm.get('correctAnswer')?.clearValidators();
        this.questionForm.get('sampleAnswer')?.clearValidators();
      
        break;
        
      case 'true-false':
        optionsArray.push(this.fb.control('Đúng', Validators.required));
        optionsArray.push(this.fb.control('Sai', Validators.required));
        this.questionForm.get('correctAnswer')?.setValidators([Validators.required]);
        this.questionForm.get('correctAnswer')?.setValue(0);
        this.questionForm.get('sampleAnswer')?.clearValidators();
        this.correctAnswers.clearValidators();
        break;
        
      case 'essay':
        this.questionForm.get('correctAnswer')?.clearValidators();
        this.questionForm.get('correctAnswer')?.setValue(null);
        this.questionForm.get('sampleAnswer')?.setValidators([Validators.required, Validators.minLength(20)]);
        this.correctAnswers.clearValidators();
        break;
    }
    
    this.questionForm.get('correctAnswer')?.updateValueAndValidity();
    this.questionForm.get('sampleAnswer')?.updateValueAndValidity();
    this.correctAnswers.updateValueAndValidity();
  }

  initializeOptionsArray(): void {
    for (let i = 0; i < 4; i++) {
      this.addOption();
    }
  }

  addOption(): void {
    this.options.push(this.fb.control('', Validators.required));
    
    // If multiple-answer, add corresponding checkbox
    if (this.questionForm.get('questionType')?.value === 'multiple-answer') {
      this.correctAnswers.push(this.fb.control(false));
    }
  }

  removeOption(index: number): void {
    const currentType = this.questionForm.get('questionType')?.value;
    const minOptions = currentType === 'true-false' ? 2 : 2;
    
    if (this.options.length > minOptions) {
      this.options.removeAt(index);
      
      // Remove corresponding checkbox for multiple-answer
      if (currentType === 'multiple-answer' && this.correctAnswers.length > index) {
        this.correctAnswers.removeAt(index);
      }
      
      // Update correct answer for single choice
      if (currentType === 'multiple-choice') {
        const correctAnswer = this.questionForm.get('correctAnswer')?.value;
        if (correctAnswer >= this.options.length && this.options.length > 0) {
          this.questionForm.patchValue({ correctAnswer: this.options.length - 1 });
        }
      }
    }
  }

  /* ---------- DISPLAY HELPERS ---------- */
  shouldShowOptions(): boolean {
    const type = this.questionForm.get('questionType')?.value;
    return type === 'multiple-choice' || type === 'multiple-answer' || type === 'true-false';
  }

  shouldShowSampleAnswer(): boolean {
    const type = this.questionForm.get('questionType')?.value;
    return type === 'essay';
  }

  shouldShowCheckboxes(): boolean {
    return this.questionForm.get('questionType')?.value === 'multiple-answer';
  }

  shouldShowRadios(): boolean {
    const type = this.questionForm.get('questionType')?.value;
    return type === 'multiple-choice' || type === 'true-false';
  }

  isOptionDisabled(index: number): boolean {
    const type = this.questionForm.get('questionType')?.value;
    return type === 'true-false' && index < 2;
  }

  isQuestionTypeMultipleChoice(): boolean {
    return this.questionForm.get('questionType')?.value === 'multiple-choice';
  }

  isQuestionTypeMultipleAnswer(): boolean {
    return this.questionForm.get('questionType')?.value === 'multiple-answer';
  }

  isQuestionTypeTrueFalse(): boolean {
    return this.questionForm.get('questionType')?.value === 'true-false';
  }

  getQuestionTypeLabel(type: string): string {
    const typeObj = this.questionTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  }

  getQuestionTypeDisplayName(questionType: string, index: number): string {
    if (questionType === 'true-false') {
      return index === 0 ? 'Đúng' : 'Sai';
    }
    return String.fromCharCode(65 + index);
  }

  getPlaceholderText(questionType: string, index: number): string {
    if (questionType === 'true-false') {
      return index === 0 ? 'Đúng' : 'Sai';
    }
    return 'Nội dung phương án...';
  }

  isReadonlyOption(questionType: string): boolean {
    return questionType === 'true-false';
  }

  /* ---------- TEMPLATE HELPERS ---------- */
  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getDifficultyEmoji(difficulty: string): string {
    const difficultyObj = this.difficulties.find(d => d.value === difficulty);
    return difficultyObj ? difficultyObj.emoji : '🟡';
  }

  /* ---------- DATA ---------- */
  loadSampleData(): void {
    this.questions = [
      {
        id: 'Q001234',
        skill: 'Listening',
        part: 'Part 3 - Conversations',
        title: 'Purpose of conversation',
        description: 'Conversation between a customer and a hotel receptionist',
        difficulty: 'Easy',
        questionType: 'multiple-choice',
        questionText: 'What is the main purpose of the conversation?',
        options: [
          'To make a room reservation',
          'To cancel a booking',
          'To complain about service',
          'To ask for directions'
        ],
        correctAnswer: 0,
        explanation: 'The customer is clearly asking about room availability and making a reservation.',
        audioFile: 'conversation_01.mp3',
        duration: 45,
        createdDate: '15/12/2024',
        createdBy: 'Nguyễn Văn A',
        status: 'published',
        tags: ['hotel', 'reservation', 'conversation']
      },
      {
        id: 'Q001235',
        skill: 'Reading',
        part: 'Part 5 - Incomplete Sentences',
        title: 'Grammar check',
        description: 'True/False grammar question',
        difficulty: 'Medium',
        questionType: 'true-false',
        questionText: 'The sentence "He have been working here for 5 years" is grammatically correct.',
        options: ['Đúng', 'Sai'],
        correctAnswer: 1,
        explanation: 'The correct form should be "He has been working" (present perfect with "has" for third person singular).',
        createdDate: '14/12/2024',
        createdBy: 'Trần Thị B',
        status: 'published',
        tags: ['grammar', 'present-perfect']
      },
      {
        id: 'Q001236',
        skill: 'Writing',
        part: 'Task 3 - Write an opinion essay',
        title: 'Essay about remote work',
        description: 'Opinion essay question',
        difficulty: 'Hard',
        questionType: 'essay',
        questionText: 'Some people believe that working from home is more productive than working in an office. Do you agree or disagree? Give reasons and examples to support your opinion. (Write at least 150 words)',
        explanation: 'This essay should include: clear position, supporting reasons, examples, and conclusion.',
        sampleAnswer: 'I strongly agree that working from home can be more productive than working in an office for several reasons. Firstly, remote work eliminates commuting time, allowing employees to use those hours for actual work or rest. Secondly, the home environment often has fewer distractions than busy offices with constant interruptions from colleagues. Additionally, employees can customize their workspace to maximize comfort and efficiency. However, productivity depends on individual self-discipline and the nature of work. For collaborative projects, office interaction might be more beneficial. In conclusion, while remote work offers significant productivity advantages, success depends on personal work style and job requirements.',
        duration: 30,
        createdDate: '13/12/2024',
        createdBy: 'Lê Văn C',
        status: 'draft',
        tags: ['essay', 'opinion', 'remote-work']
      },
      {
        id: 'Q001237',
        skill: 'Reading',
        part: 'Part 7 - Reading Comprehension',
        title: 'Multiple selection question',
        description: 'Choose all correct statements about the passage',
        difficulty: 'Hard',
        questionType: 'multiple-answer',
        questionText: 'Which of the following statements are true according to the passage? (Select all that apply)',
        options: [
          'The company will expand to new markets',
          'Sales increased by 25% last quarter',
          'The CEO announced retirement plans',
          'New products will be launched next year'
        ],
        correctAnswer: [0, 1, 3], // Multiple correct answers
        explanation: 'Statements A, B, and D are explicitly mentioned in the passage. Statement C is not mentioned.',
        createdDate: '12/12/2024',
        createdBy: 'Hoàng Thị E',
        status: 'published',
        tags: ['reading', 'multiple-answer', 'business']
      }
    ];
    this.filteredQuestions = [...this.questions];
  }

  /* ---------- FILTERING ---------- */
  filterQuestions(): void {
    this.filteredQuestions = this.questions.filter(q => {
      const searchLower = this.searchTerm.toLowerCase();
      const matchesSearch = 
        q.title?.toLowerCase().includes(searchLower) ||
        q.description?.toLowerCase().includes(searchLower) ||
        q.questionText.toLowerCase().includes(searchLower);
      
      const matchesSkill = !this.selectedSkill || q.skill === this.selectedSkill;
      const matchesPart = !this.selectedPart || q.part === this.selectedPart;
      const matchesDifficulty = !this.selectedDifficulty || q.difficulty === this.selectedDifficulty;
      const matchesStatus = !this.selectedStatus || q.status === this.selectedStatus;
      
      return matchesSearch && matchesSkill && matchesPart && matchesDifficulty && matchesStatus;
    });
  }

  onSearchChange(): void { this.filterQuestions(); }
  onSkillChange(): void { 
    this.selectedPart = '';
    this.filterQuestions(); 
  }
  onPartChange(): void { this.filterQuestions(); }
  onDifficultyChange(): void { this.filterQuestions(); }
  onStatusChange(): void { this.filterQuestions(); }

  /* ---------- PARTS HELPER ---------- */
  getPartsForSkill(skill: string): string[] {
    switch (skill) {
      case 'Listening': return this.listeningParts;
      case 'Reading': return this.readingParts;
      case 'Speaking': return this.speakingParts;
      case 'Writing': return this.writingParts;
      default: return [];
    }
  }

  /* ---------- MODAL ---------- */
  openModal(question: TOEICQuestion | null = null): void {
    this.editingQuestion = question;
    this.isModalOpen = true;
    
    if (question) {
      // Clear existing arrays
      while (this.options.length !== 0) {
        this.options.removeAt(0);
      }
      while (this.correctAnswers.length !== 0) {
        this.correctAnswers.removeAt(0);
      }
      
      this.questionForm.patchValue({
        skill: question.skill,
        part: question.part,
        title: question.title || '',
        duration: question.duration || '',
        difficulty: question.difficulty,
        questionType: question.questionType,
        questionText: question.questionText,
        correctAnswer: question.questionType === 'multiple-answer' ? null : (question.correctAnswer || 0),
        explanation: question.explanation,
        sampleAnswer: question.sampleAnswer || '',
        audioFile: question.audioFile || '',
        imageFile: question.imageFile || '',
        tags: question.tags.join(', ')
      });
      
      if (question.options) {
        question.options.forEach((option, index) => {
          this.options.push(this.fb.control(option, Validators.required));
          
          // Handle multiple-answer checkboxes
          if (question.questionType === 'multiple-answer') {
            const isChecked = Array.isArray(question.correctAnswer) 
              ? question.correctAnswer.includes(index) 
              : false;
            this.correctAnswers.push(this.fb.control(isChecked));
          }
        });
      } else {
        this.onQuestionTypeChange(question.questionType);
      }
    } else {
      // Reset form for new question
      this.questionForm.reset({
        skill: '',
        part: '',
        title: '',
        duration: '',
        difficulty: 'Medium',
        questionType: 'multiple-choice',
        questionText: '',
        correctAnswer: 0,
        explanation: '',
        sampleAnswer: '',
        audioFile: '',
        imageFile: '',
        tags: ''
      });
      
      while (this.options.length !== 0) {
        this.options.removeAt(0);
      }
      while (this.correctAnswers.length !== 0) {
        this.correctAnswers.removeAt(0);
      }
      this.onQuestionTypeChange('multiple-choice');
    }
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingQuestion = null;
    this.questionForm.reset();
    while (this.options.length !== 0) {
      this.options.removeAt(0);
    }
    while (this.correctAnswers.length !== 0) {
      this.correctAnswers.removeAt(0);
    }
  }

  /* ---------- CRUD ---------- */
  saveQuestion(): void {
    if (this.questionForm.valid) {
      const formData = this.questionForm.value;
      const tags = formData.tags ? formData.tags.split(',').map((tag: string) => tag.trim()) : [];
      
      const questionData: Partial<TOEICQuestion> = {
        skill: formData.skill,
        part: formData.part,
        title: formData.title || undefined,
        description: formData.description || undefined,
        difficulty: formData.difficulty,
        questionType: formData.questionType,
        questionText: formData.questionText,
        explanation: formData.explanation,
        audioFile: formData.audioFile || undefined,
        imageFile: formData.imageFile || undefined,
        duration: formData.duration ? Number(formData.duration) : undefined,
        tags: tags
      };

      if (this.shouldShowOptions()) {
        questionData.options = formData.options;
        
        // Handle correct answers based on question type
        if (formData.questionType === 'multiple-answer') {
          // Get indices of checked answers
          const correctIndices: number[] = [];
          formData.correctAnswers.forEach((isChecked: boolean, index: number) => {
            if (isChecked) correctIndices.push(index);
          });
          questionData.correctAnswer = correctIndices;
        } else {
          questionData.correctAnswer = Number(formData.correctAnswer);
        }
      }
      
      if (this.shouldShowSampleAnswer()) {
        questionData.sampleAnswer = formData.sampleAnswer;
      }
      
      if (this.editingQuestion) {
        const index = this.questions.findIndex(q => q.id === this.editingQuestion!.id);
        if (index !== -1) {
          this.questions[index] = {
            ...this.questions[index],
            ...questionData
          } as TOEICQuestion;
        }
      } else {
        const newQuestion: TOEICQuestion = {
          id: this.generateQuestionId(),
          createdDate: new Date().toLocaleDateString('vi-VN'),
          createdBy: 'Current User',
          status: 'draft',
          ...questionData
        } as TOEICQuestion;
        this.questions.push(newQuestion);
      }
      
      this.filterQuestions();
      this.closeModal();
    }
  }

  deleteQuestion(id: string): void {
    if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      this.questions = this.questions.filter(q => q.id !== id);
      this.filterQuestions();
    }
  }

  publishQuestion(id: string): void {
    const question = this.questions.find(q => q.id === id);
    if (question) {
      question.status = 'published';
      this.filterQuestions();
    }
  }

  /* ---------- HELPERS ---------- */
  generateQuestionId(): string {
    const timestamp = Date.now().toString().slice(-6);
    return `Q${timestamp}`;
  }

  getSkillColor(skill: string): string {
    switch (skill) {
      case 'Listening': return 'blue';
      case 'Reading': return 'green';
      case 'Speaking': return 'purple';
      case 'Writing': return 'orange';
      default: return 'gray';
    }
  }

  getDifficultyClass(difficulty: string): string {
    switch (difficulty) {
      case 'Easy': return 'difficulty-easy';
      case 'Medium': return 'difficulty-medium';
      case 'Hard': return 'difficulty-hard';
      default: return 'difficulty-easy';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'published': return 'status-published';
      case 'draft': return 'status-draft';
      case 'archived': return 'status-archived';
      default: return 'status-draft';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'published': return 'Đã xuất bản';
      case 'draft': return 'Bản nháp';
      case 'archived': return 'Đã lưu trữ';
      default: return status;
    }
  }

  /* ---------- STATS ---------- */
  getQuestionStats(): QuestionStats {
    return {
      listening: this.questions.filter(q => q.skill === 'Listening').length,
      reading: this.questions.filter(q => q.skill === 'Reading').length,
      speaking: this.questions.filter(q => q.skill === 'Speaking').length,
      writing: this.questions.filter(q => q.skill === 'Writing').length,
      total: this.questions.length
    };
  }

  /* ---------- SLICE PIPE ALTERNATIVE ---------- */
  sliceText(text: string, length: number): string {
    return text && text.length > length ? text.slice(0, length) + '...' : text || '';
  }

  /* ---------- MULTIPLE ANSWER DISPLAY HELPERS ---------- */
  isMultipleAnswerCorrect(question: TOEICQuestion, index: number): boolean {
    if (question.questionType === 'multiple-answer' && Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.includes(index);
    }
    return false;
  }

  getMultipleAnswerDisplay(question: TOEICQuestion): string {
    if (question.questionType === 'multiple-answer' && Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.map(index => String.fromCharCode(65 + index)).join(', ');
    }
    return '';
  }
}
