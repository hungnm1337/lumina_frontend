import { ExamPartService } from './../../../../Services/ExamPart/exam-part.service';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { QuestionService } from '../../../../Services/Question/question.service';
import { CommonModule } from '@angular/common';
import { UploadService } from '../../../../Services/Upload/upload.service';
import { noWhitespaceValidator, meaningfulContentValidator } from '../../../../../environments/custom-validators';
import { PopupComponent } from '../../../Common/popup/popup.component';

@Component({
  selector: 'app-questions',
  templateUrl: './questions.component.html',
  styleUrls: ['./questions.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule, PopupComponent],
})
export class QuestionsComponent implements OnInit {
  isModalOpen = false;
  promptForm: FormGroup;
  skills = ['Listening', 'Reading', 'Speaking', 'Writing'];
  parts: any[] = [];
  isImportModalOpen = false;
  excelFile: File | null = null;
  importPartId: number | null = null;
  isEditModalOpen = false;
  editPassageForm!: FormGroup;
  editPromptForm!: FormGroup;
  message: string = '';
  messageType: string = 'success'; // hoặc 'error'

  // Popup confirmation for delete
  showDeletePromptPopup = false;
  deletePromptTitle = '';
  deletePromptMessage = '';
  pendingDeletePrompt: any = null;

  showDeleteQuestionPopup = false;
  deleteQuestionTitle = '';
  deleteQuestionMessage = '';
  pendingDeleteQuestion: any = null;

  constructor(
    private fb: FormBuilder,
    private examPartService: ExamPartService,
    private questionService: QuestionService,
    private mediaService: UploadService
  ) {
    this.promptForm = this.fb.group({
      contentText: ['', [Validators.required, noWhitespaceValidator(), meaningfulContentValidator()]],
      title: ['', [Validators.required, noWhitespaceValidator(), meaningfulContentValidator()]],
      skill: ['', Validators.required],
      partId: ['', Validators.required],
      promptId: [null],
      referenceImageUrl: [''],
      referenceAudioUrl: [''],
      questions: this.fb.array([]),
    });
    this.addQuestion(); // khởi tạo 1 question mẫu
  }

  ngOnInit(): void {
    this.initData();
  }

  initData() {
    this.examPartService.getExamsParts().subscribe((res) => {
      this.parts = res || [];
      // Lấy danh sách ExamSetKey unique và sắp xếp
      this.examSetKeys = Array.from(
        new Set(this.parts.map((p) => p.examSetKey))
      ).sort((a, b) => {
        // Chuyển đổi từ MM-YYYY sang YYYY-MM để sắp xếp đúng
        const [monthA, yearA] = a.split('-');
        const [monthB, yearB] = b.split('-');
        const dateA = `${yearA}-${monthA}`;
        const dateB = `${yearB}-${monthB}`;
        return dateA.localeCompare(dateB);
      });
      // console.log('📋 ExamSetKeys (sorted):', this.examSetKeys);
    });
    this.loadPrompts();
    this.loadStatistics();
  }

  prompts: any[] = [];
  page = 1;
  size = 10;
  totalPages = 0;
  selectedPartId: number | '' = '';
  loading = false;
  uploading = false;

  // ExamSetKey filter
  examSetKeys: string[] = [];
  selectedExamSetKey: string | null = null;
  selectedSkillFilter: string | null = null;
  filteredPartsForView: any[] = [];

  // Lấy danh sách câu hỏi từ API, hỗ trợ filter, search, paging
  loadPrompts() {
    this.loading = true;
    const params: any = {
      page: this.page,
      size: this.size,
    };
    if (this.selectedPartId) {
      params.partId = this.selectedPartId;
    }
    this.questionService.getQuestions(params).subscribe({
      next: (res: any) => {
        this.prompts = res.items || [];
        this.totalPages = res.totalPages || 1;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  // ✅ Hàm xử lý khi chọn ExamSetKey
  onExamSetKeyFilterChange() {
    // console.log('🔍 ExamSetKey filter changed:', this.selectedExamSetKey);
    // Reset skill và part khi đổi ExamSetKey
    this.selectedSkillFilter = null;
    this.selectedPartId = '';
    this.filterPartsForView();
    // Reset về trang 1 và load lại
    this.page = 1;
    this.loadPrompts();
  }

  // Hàm xử lý khi chọn Skill filter
  onSkillFilterChange() {
    // console.log('🔍 Skill filter changed:', this.selectedSkillFilter);
    // Reset part khi đổi Skill
    this.selectedPartId = '';
    this.filterPartsForView();
    // Reset về trang 1 và load lại
    this.page = 1;
    this.loadPrompts();
  }

  // Hàm filter parts cho view
  filterPartsForView() {
    if (!this.selectedExamSetKey) {
      this.filteredPartsForView = [];
      return;
    }

    this.filteredPartsForView = this.parts.filter((p) => {
      const matchesExamSetKey = p.examSetKey === this.selectedExamSetKey;
      
      if (!this.selectedSkillFilter) {
        return matchesExamSetKey;
      }
      
      const skillUpper = this.selectedSkillFilter.toUpperCase();
      const partCodeUpper = p.partCode?.toUpperCase() || '';
      const matchesSkill = partCodeUpper.includes(skillUpper);
      
      return matchesExamSetKey && matchesSkill;
    });
    
    // console.log('📋 Filtered parts for view:', this.filteredPartsForView);
  }

  onPartFilterChange() {
    // console.log('🔍 Part filter changed:', this.selectedPartId);
    this.page = 1;
    this.loadPrompts();
  }
  onPageChange(newPage: number) {
    this.page = newPage;
    this.loadPrompts();
  }

  get questions(): FormArray {
    return this.promptForm.get('questions') as FormArray;
  }

  isUploadModalOpen = false;
  uploadedUrl: string | null = null;

  openUploadModal() {
    this.isUploadModalOpen = true;
    this.uploadedUrl = null;
  }

  closeUploadModal() {
    this.isUploadModalOpen = false;
    this.uploadedUrl = null;
  }

  // Upload file lên Cloudinary
  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const isValid =
      this.isAcceptedMedia(file, [
        { prefix: 'image/', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
        { prefix: 'audio/', extensions: ['mp3', 'wav', 'm4a', 'ogg'] },
      ]);

    if (!isValid) {
      alert('Vui lòng chọn file hình ảnh hoặc âm thanh hợp lệ!');
      return;
    }

    this.uploading = true;
    this.uploadedUrl = null;

    this.mediaService.uploadFile(file).subscribe({
      next: (res) => {
        if (res && res.url) {
          this.uploadedUrl = res.url;
        }
        this.uploading = false;
      },
      error: () => {
        this.uploading = false;
        alert('Upload thất bại!');
      },
    });
  }

  // Copy url vào clipboard
  copyUrl(url: string) {
    navigator.clipboard.writeText(url);
  }

  addQuestion() {
    // Tạo cấu hình đầy đủ trường mỗi lần add
    const questionGroup: any = {
      stemText: ['', [Validators.required, noWhitespaceValidator(), meaningfulContentValidator()]],
      questionExplain: ['', [meaningfulContentValidator()]],
      scoreWeight: [1, [Validators.required, Validators.min(1)]],
      time: [30, [Validators.required, Validators.min(1)]],
    };

    if (this.selectedSkill !== 'Speaking' && this.selectedSkill !== 'Writing') {
      questionGroup.options = this.fb.array([
        this.createOption(),
        this.createOption(),
        this.createOption(),
        this.createOption(),
      ]);
    }

    this.questions.push(this.fb.group(questionGroup));
  }

  removeQuestion(index: number) {
    this.questions.removeAt(index);
  }

  createOption(option?: any): FormGroup {
    return this.fb.group({
      optionId: [option?.optionId ?? null],
      content: [option?.content ?? '', [Validators.required, noWhitespaceValidator(), meaningfulContentValidator()]],
      isCorrect: [option?.isCorrect ?? false],
    });
  }

  getOptions(i: number): FormArray {
    const group = this.questions.at(i) as FormGroup;
    return (group.get('options') as FormArray) || this.fb.array([]);
  }

  openImportModal() {
    this.isImportModalOpen = true;
    this.excelFile = null;
    this.importPartId = null;
  }

  closeImportModal() {
    this.isImportModalOpen = false;
    this.excelFile = null;
    this.importPartId = null;
  }

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.resetPromptForm();
  }

  // Reset form về trạng thái ban đầu
  resetPromptForm() {
    this.promptForm.reset({
      contentText: '',
      title: '',
      skill: '',
      partId: '',
      promptId: null,
      referenceImageUrl: '',
      referenceAudioUrl: ''
    });
    
    // Xóa tất cả câu hỏi
    while (this.questions.length !== 0) {
      this.questions.removeAt(0);
    }
    
    // Reset các biến liên quan
    this.selectedSkill = '';
    this.filteredParts = [];
    this.selectedPartQuestionCount = 0;
    this.selectedExamSetKeyForCreate = '';
  }

  uploadMedia(event: any, field: 'referenceImageUrl' | 'referenceAudioUrl') {
    const file = event.target.files[0];
    if (!file) return;

    const isImageField = field === 'referenceImageUrl';
    const validations = isImageField
      ? [{ prefix: 'image/', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
      : [{ prefix: 'audio/', extensions: ['mp3', 'wav', 'm4a', 'ogg'] }];

    if (!this.isAcceptedMedia(file, validations)) {
      alert(
        `Vui lòng chọn file ${
          isImageField ? 'hình ảnh' : 'âm thanh'
        } đúng định dạng!`
      );
      return;
    }

    this.mediaService.uploadFile(file).subscribe({
      next: (res) => {
        this.promptForm.patchValue({ [field]: res.url });
      },
      error: () => alert('Upload thất bại!'),
    });
  }

  private isAcceptedMedia(
    file: File,
    rules: { prefix: string; extensions: string[] }[]
  ): boolean {
    const type = (file.type || '').toLowerCase();
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    return rules.some(
      (rule) =>
        (!!type && type.startsWith(rule.prefix)) ||
        (!!ext && rule.extensions.includes(ext))
    );
  }
  selectedSkill: string = '';
  filteredParts: any[] = [];
  selectedPartQuestionCount: number = 0;
  selectedExamSetKeyForCreate: string = '';

  // Hard code số lượng câu hỏi theo Part
  private readonly partQuestionCounts: { [key: string]: number } = {
    LISTENING_PART_1: 1,
    LISTENING_PART_2: 1,
    LISTENING_PART_3: 3,
    LISTENING_PART_4: 3,
    READING_PART_6: 4,
    READING_PART_7: 3,
    SPEAKING_PART_1: 1,
    SPEAKING_PART_2: 1,
    SPEAKING_PART_3: 3,
    SPEAKING_PART_4: 4,
    SPEAKING_PART_5: 1,
    WRITING_PART_1: 1,
    WRITING_PART_2: 1,
    WRITING_PART_3: 1,
  };

  // XÓA hàm onSkillChange cũ này (từ dòng ~220)
  // onSkillChange(event: any) {
  //   this.selectedSkill = event.target.value;
  //   // Xoá câu hỏi cũ
  //   while (this.questions.length !== 0) {
  //     this.questions.removeAt(0);
  //   }
  //   // Thêm câu hỏi mới phù hợp skill
  //   this.addQuestion();
  //   // Reset partId
  //   this.promptForm.patchValue({ partId: '' });
  //   // Cập nhật filtered parts
  //   this.filterPartsBySkill();
  // }

  // filterPartsBySkill() {
  //   if (!this.selectedSkill) {
  //     this.filteredParts = [];
  //   } else {
  //     const skillUpper = this.selectedSkill.toUpperCase();
  //     this.filteredParts = this.parts.filter(p =>
  //       p.skillType && p.skillType.toUpperCase() === skillUpper
  //     );
  //   }
  // }

  // filterPartsBySkill() {
  //   if (!this.selectedSkill) {
  //     this.filteredParts = [];
  //   } else {
  //     const skillUpper = this.selectedSkill.toUpperCase();
  //     this.filteredParts = this.parts.filter(
  //       (p) => p.skillType && p.skillType.toUpperCase() === skillUpper
  //     );
  //   }
  // }

  onExamSetKeyChangeForCreate(): void {
    // console.log('=== onExamSetKeyChangeForCreate ===');
    // console.log('selectedExamSetKeyForCreate:', this.selectedExamSetKeyForCreate);

    // Xóa tất cả câu hỏi cũ
    while (this.questions.length !== 0) {
      this.questions.removeAt(0);
    }

    // Reset skill và part
    this.selectedSkill = '';
    this.filteredParts = [];
    this.promptForm.patchValue({ skill: '', partId: '' });
    this.selectedPartQuestionCount = 0;
  }

  onSkillChange(event: any): void {
    this.selectedSkill = event.target.value;

    // console.log('=== onSkillChange ===');
    // console.log('selectedSkill:', this.selectedSkill);

    // Xóa tất cả câu hỏi cũ
    while (this.questions.length !== 0) {
      this.questions.removeAt(0);
    }

    // Lọc parts theo skill và ExamSetKey
    this.filterPartsBySkill();

    // Reset partId và selectedPartQuestionCount
    this.promptForm.patchValue({ partId: '' });
    this.selectedPartQuestionCount = 0;

    // KHÔNG thêm câu hỏi mẫu nữa - chỉ thêm khi chọn Part
    // this.addQuestion();

    // console.log('filteredParts:', this.filteredParts);
  }

  filterPartsBySkill() {
    if (!this.selectedSkill || !this.selectedExamSetKeyForCreate) {
      this.filteredParts = [];
    } else {
      const skillUpper = this.selectedSkill.toUpperCase();
      this.filteredParts = this.parts.filter((p) => {
        const partCodeUpper = p.partCode?.toUpperCase() || '';
        const matchesSkill = partCodeUpper.includes(skillUpper);
        const matchesExamSetKey = p.examSetKey === this.selectedExamSetKeyForCreate;
        return matchesSkill && matchesExamSetKey;
      });
    }
  }

  onPartSelected(): void {
    const selectedPartId = this.promptForm.get('partId')?.value;

    // console.log('=== DEBUG onPartSelected ===');
    // console.log('selectedPartId:', selectedPartId);
    // console.log('selectedPartId type:', typeof selectedPartId);
    // console.log('this.parts:', this.parts);
    // console.log('this.filteredParts:', this.filteredParts);

    // Tìm trong filteredParts thay vì this.parts
    const selectedPart = this.filteredParts.find((p) => {
      // console.log(
      //   'Comparing:',
      //   p.partId,
      //   'with',
      //   selectedPartId,
      //   'equal?',
      //   p.partId == selectedPartId
      // );
      return p.partId == selectedPartId; // Dùng == để so sánh cả string và number
    });

    // console.log('selectedPart:', selectedPart);

    if (selectedPart && selectedPart.partCode) {
      const partCode = selectedPart.partCode.toUpperCase().trim();
      // console.log('partCode (normalized):', partCode);
      // console.log('partQuestionCounts:', this.partQuestionCounts);
      // console.log('Looking for key:', partCode);

      this.selectedPartQuestionCount = this.partQuestionCounts[partCode] || 0;
      // console.log('selectedPartQuestionCount:', this.selectedPartQuestionCount);

      if (this.selectedPartQuestionCount > 0) {
        this.adjustQuestionsToMatch(this.selectedPartQuestionCount);
      } else {
        // console.warn('Không tìm thấy số lượng câu hỏi cho partCode:', partCode);
        // console.warn('Các key có sẵn:', Object.keys(this.partQuestionCounts));
        this.adjustQuestionsToMatch(1);
      }
    } else {
      // console.log('Không tìm thấy part hoặc partCode');
      // console.log('selectedPart:', selectedPart);
      this.selectedPartQuestionCount = 0;
      this.adjustQuestionsToMatch(1);
    }
    // console.log('=== END DEBUG ===');
  }

  private adjustQuestionsToMatch(count: number): void {
    // console.log('=== adjustQuestionsToMatch ===');
    // console.log('Target count:', count);
    // console.log('Current questions length:', this.questions.length);

    while (this.questions.length !== 0) {
      this.questions.removeAt(0);
    }

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        this.addQuestion();
      }
      // console.log('Đã thêm', count, 'câu hỏi');
      // console.log('New questions length:', this.questions.length);
    } else {
      // console.log('Count = 0, không thêm câu hỏi');
    }
  }

  savePrompt() {
    if (this.promptForm.invalid) {
      const errors = this.getFormValidationErrors(this.promptForm);
      this.showMessage(errors || 'Vui lòng nhập đủ thông tin hợp lệ!', 'error');
      return;
    }

    const f = this.promptForm.value;

    // Validate: mỗi câu hỏi phải có ít nhất 1 option đúng và chỉ được phép 1 đáp án đúng
    for (const q of f.questions) {
      if (Array.isArray(q.options) && q.options.length > 0) {
        const correctOptions = q.options.filter((opt: any) => !!opt.isCorrect);
        
        if (correctOptions.length === 0) {
          this.showMessage('Mỗi câu hỏi phải có ít nhất 1 đáp án đúng!', 'error');
          return;
        }
        
        if (correctOptions.length > 1) {
          this.showMessage('Mỗi câu hỏi chỉ được phép có 1 đáp án đúng!', 'error');
          return;
        }
      }
    }

    const dto = {
      title: f.title,
      contentText: f.contentText,
      skill: f.skill,
      referenceImageUrl: f.referenceImageUrl,
      referenceAudioUrl: f.referenceAudioUrl,
      questions: f.questions.map((q: any) => {
        let questionType = 'SINGLE_CHOICE';
        if (f.skill === 'Speaking') questionType = 'SPEAKING';
        else if (f.skill === 'Writing') questionType = 'WRITING';
        else if (Array.isArray(q.options)) {
          const correctCount = q.options.filter(
            (opt: any) => opt.isCorrect
          ).length;
          questionType =
            correctCount === 1 ? 'SINGLE_CHOICE' : 'MULTIPLE_CHOICE';
        }
        return {
          question: {
            partId: f.partId,
            questionType: questionType,
            stemText: q.stemText,
            scoreWeight: q.scoreWeight,
            questionExplain: q.questionExplain,
            time: q.time,
          },
          options:
            f.skill === 'Speaking' || f.skill === 'Writing'
              ? []
              : (q.options || []).map((opt: any) => ({
                  content: opt.content,
                  isCorrect: !!opt.isCorrect,
                })),
        };
      }),
    };
    // console.log('Submitting DTO:', dto);

    this.questionService.createPromptWithQuestions(dto).subscribe({
      next: (res) => {
        this.showMessage('Thêm mới thành công!', 'success');
        this.resetPromptForm();
        this.closeModal();
        this.loadPrompts();
      },
      error: (err) => {
        let errorMsg = 'An error occurred';
        if (err.error && err.error.error) {
          errorMsg = err.error.error;
        } else if (err.error) {
          errorMsg =
            typeof err.error === 'string'
              ? err.error
              : JSON.stringify(err.error);
        } else if (err.message) {
          errorMsg = err.message;
        }
        this.showMessage('Error: ' + errorMsg, 'error');
      },
    });
  }

  onExcelFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.excelFile = file;
    }
  }

  importExcel() {
    if (!this.importPartId || !this.excelFile) {
      alert('Vui lòng nhập PartId và chọn file Excel');
      return;
    }
    this.questionService
      .importQuestionsExcel(this.excelFile, this.importPartId)
      .subscribe({
        next: (response) => {
          alert(response?.message || 'Import thành công!');
          this.closeImportModal();
          this.initData();
        },
        error: (err) => {
          console.error('Import error:', err);
          let errorMsg = 'Lỗi import file excel!';
          
          // Kiểm tra các trường hợp error response
          if (err.error?.message) {
            errorMsg = err.error.message;
          } else if (err.error?.error) {
            errorMsg = err.error.error;
          } else if (err.error && typeof err.error === 'string') {
            errorMsg = err.error;
          } else if (err.message) {
            errorMsg = err.message;
          }
          
          alert('Lỗi: ' + errorMsg);
        },
      });
  }

  toggleShowQuestions(passage: any) {
    passage.showQuestions = !passage.showQuestions;
  }

  // Mở modal và load dữ liệu passage, prompt vào form
  // editPassage(passage: any) {
  //   this.isEditModalOpen = true;
  //   this.editPassageForm = this.fb.group({
  //     passageId: [passage.passageId],
  //     title: [passage.title, Validators.required],
  //     contentText: [passage.contentText, Validators.required],
  //     prompt: this.fb.group({
  //       promptId: [passage.prompt?.promptId || null],
  //       skill: [passage.prompt?.skill || '', Validators.required],
  //       promptText: [passage.prompt?.promptText || ''],
  //       referenceImageUrl: [passage.prompt?.referenceImageUrl || ''],
  //       referenceAudioUrl: [passage.prompt?.referenceAudioUrl || '']
  //     });
  //   });
  // }

  editPrompt(prompt: any) {
    this.isEditModalOpen = true;
    this.editPromptForm = this.fb.group({
      promptId: [prompt.promptId],
      title: [prompt.title, [Validators.required, noWhitespaceValidator(), meaningfulContentValidator()]],
      contentText: [
        prompt.contentText,
        [Validators.required, noWhitespaceValidator(), meaningfulContentValidator()],
      ],
      skill: [prompt.skill || '', Validators.required],
      promptText: [prompt.promptText || ''],
      referenceImageUrl: [prompt.referenceImageUrl || ''],
      referenceAudioUrl: [prompt.referenceAudioUrl || ''],
    });
  }

  // Hàm lưu khi submit modal
  saveEditPrompt() {
    if (this.editPromptForm.invalid) {
      const errors = this.getFormValidationErrors(this.editPromptForm);
      this.showMessage(errors || 'Vui lòng điền đầy đủ thông tin hợp lệ!', 'error');
      return;
    }
    const dto = this.editPromptForm.value;
    this.questionService.editPassage(dto).subscribe({
      next: () => {
        this.showMessage('Cập nhật thành công!', 'success');
        this.isEditModalOpen = false;
        this.loadPrompts(); // reload lại danh sách
      },
      error: () => alert('Có lỗi khi cập nhật passage'),
    });
  }

  // Đóng modal
  closeEditModal() {
    this.isEditModalOpen = false;
  }

  showMessage(msg: string, type: 'success' | 'error' = 'success') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => (this.message = ''), 3000); // tự động ẩn sau 3s
  }

  isQuestionModalOpen = false;
  questionForm!: FormGroup;
  isEditQuestion = false;
  editQuestionIndex: number | null = null;

  currentSkill: string = '';
  // Mở modal để thêm câu hỏi mới
  openModalAdd(prompt: any) {
    this.isEditQuestion = false;
    this.isQuestionModalOpen = true;
    this.currentSkill = prompt.skill || '';
    this.currentPartId = prompt.partId || null;
    this.currentPromptId = prompt.promptId || null;
    // console.log('openModalAdd - currentPartId:', this.currentPartId);
    const formObj: any = {
      stemText: ['', [Validators.required, noWhitespaceValidator(), meaningfulContentValidator()]],
      questionExplain: ['', [meaningfulContentValidator()]],
      scoreWeight: [1, [Validators.required, Validators.min(1)]],
      time: [30, [Validators.required, Validators.min(1)]],
    };

    if (
      this.currentSkill !== 'Speaking' &&
      this.currentSkill !== 'Writing' &&
      this.currentSkill !== 'SPEAKING' &&
      this.currentSkill !== 'WRITING'
    ) {
      formObj.options = this.fb.array([
        this.createOption(),
        this.createOption(),
        this.createOption(),
        this.createOption(),
      ]);
    }
    this.questionForm = this.fb.group(formObj);
  }

  // Mở modal để sửa câu hỏi (truyền dữ liệu cũ vào form)
  editQuestionIdx: number | null = null;

  currentPartId: number | null = null;

  currentPromptId: number | null = null;

  // Helper method để kiểm tra Speaking skill
  private isSpeakingSkill(skill: string): boolean {
    const speakingSkills = ['Speaking', 'SPEAKING'];
    return speakingSkills.includes(skill);
  }

  editQuestion(q: any, prompt: any) {
    this.isEditQuestion = true;
    this.editQuestionIdx = q.questionId;
    this.currentPartId = prompt.partId;
    this.currentPromptId = prompt.promptId;
    this.isQuestionModalOpen = true;
    // Lấy skill đúng từ prompt trả về từ API
    this.currentSkill = prompt.skill || '';

    const formObj: any = {
      stemText: [q.stemText, [Validators.required, noWhitespaceValidator(), meaningfulContentValidator()]],
      questionExplain: [q.questionExplain || '', [meaningfulContentValidator()]],
      scoreWeight: [
        q.scoreWeight ?? 1,
        [Validators.required, Validators.min(1)],
      ],
      time: [q.time ?? 30, [Validators.required, Validators.min(1)]],
    };

    // Thêm Sample Answer cho Speaking questions
    if (this.isSpeakingSkill(this.currentSkill)) {
      formObj.sampleAnswer = [q.sampleAnswer || '', [meaningfulContentValidator()]];
    }

    if (
      this.currentSkill !== 'Speaking' &&
      this.currentSkill !== 'Writing' &&
      this.currentSkill !== 'SPEAKING' &&
      this.currentSkill !== 'WRITING'
    ) {
      const optionSource =
        q.options && q.options.length ? q.options : Array(4).fill(null);
      formObj.options = this.fb.array(
        optionSource.map((opt: any) => this.createOption(opt))
      );
    }
    this.questionForm = this.fb.group(formObj);
  }

  closeQuestionModal() {
    this.isQuestionModalOpen = false;
  }

  // Truy xuất mảng options
  get options(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }


  // Thêm mới câu hỏi
  saveQuestion() {
    if (this.questionForm.invalid) {
      const scoreControl = this.questionForm.get('scoreWeight');
      if (scoreControl?.errors?.['min']) {
        this.showMessage('Điểm mỗi câu hỏi phải lớn hơn 0!', 'error');
        return;
      }
      const errors = this.getFormValidationErrors(this.questionForm);
      this.showMessage(errors || 'Vui lòng nhập đủ thông tin hợp lệ!', 'error');
      return;
    }
    const value = this.questionForm.value;

    // Validate: phải có ít nhất 1 option đúng và chỉ được phép 1 đáp án đúng nếu có options
    if (Array.isArray(value.options) && value.options.length > 0) {
      const correctOptions = value.options.filter((opt: any) => !!opt.isCorrect);
      
      if (correctOptions.length === 0) {
        this.showMessage('Câu hỏi phải có ít nhất 1 đáp án đúng!', 'error');
        return;
      }
      
      if (correctOptions.length > 1) {
        this.showMessage('Mỗi câu hỏi chỉ được phép có 1 đáp án đúng!', 'error');
        return;
      }
    }

    let questionType = 'SINGLE_CHOICE';
    if (this.currentSkill === 'Speaking') {
      questionType = 'SPEAKING';
    } else if (this.currentSkill === 'Writing') {
      questionType = 'WRITING';
    } else if (Array.isArray(value.options)) {
      const correctOptionCount = value.options.filter(
        (opt: any) => opt.isCorrect
      ).length;
      questionType =
        correctOptionCount === 1 ? 'SINGLE_CHOICE' : 'MULTIPLE_CHOICE';
    }

    const dto: any = {
      questionId: this.isEditQuestion ? this.editQuestionIdx : null,
      partId: this.currentPartId,
      promptId: this.currentPromptId,
      stemText: value.stemText,
      questionExplain: value.questionExplain,
      scoreWeight: +value.scoreWeight,
      time: +value.time,
      questionType: questionType,
    };

    // Include sampleAnswer cho Speaking questions
    if (this.isSpeakingSkill(this.currentSkill)) {
      dto.sampleAnswer = value.sampleAnswer || null;
    }

    if (
      this.currentSkill !== 'Speaking' &&
      this.currentSkill !== 'Writing' &&
      Array.isArray(value.options)
    ) {
      dto.options = value.options.map((opt: any) => {
        const optionPayload: any = {
          content: opt.content,
          isCorrect: !!opt.isCorrect,
        };
        if (opt.optionId) {
          optionPayload.optionId = opt.optionId;
        }
        return optionPayload;
      });
    } else {
      dto.options = [];
    }

    // console.log('Sending DTO:', dto);

    const apiCall =
      this.isEditQuestion && this.editQuestionIdx !== null
        ? this.questionService.editQuestion(dto)
        : this.questionService.addQuestion(dto);

    apiCall.subscribe({
      next: (res) => {
        this.showMessage(
          res?.message ||
            (this.isEditQuestion
              ? 'Question updated successfully!'
              : 'Question created successfully!'),
          'success'
        );
        this.isQuestionModalOpen = false;
        this.loadPrompts();
      },
      error: (err) => {
        const errorMsg =
          err.error?.message ||
          err.error?.error;
        this.showMessage(errorMsg, 'error');
      },
    });
  }

  deleteQuestion(q: any) {
    this.pendingDeleteQuestion = q;
    this.deleteQuestionTitle = '🗑️ Xác Nhận Xóa Câu Hỏi';
    this.deleteQuestionMessage = `Bạn có chắc chắn muốn xóa câu hỏi này không?\n\nHành động này không thể hoàn tác.`;
    this.showDeleteQuestionPopup = true;
  }

  onConfirmDeleteQuestion() {
    if (!this.pendingDeleteQuestion) return;

    this.questionService.deleteQuestion(this.pendingDeleteQuestion.questionId).subscribe({
      next: (res) => {
        const msg = res?.message
          ? res.message
          : typeof res === 'string'
          ? res
          : 'Question deleted successfully!';
        this.showMessage(msg, 'success');
        this.loadPrompts();
      },
      error: (err) => {
        let msg = 'Failed to delete question!';
        if (err?.error?.message) msg = err.error.message;
        else if (typeof err?.error === 'string') msg = err.error;
        this.showMessage(msg, 'error');
      }
    });

    this.showDeleteQuestionPopup = false;
    this.pendingDeleteQuestion = null;
  }

  onCancelDeleteQuestion() {
    this.showDeleteQuestionPopup = false;
    this.pendingDeleteQuestion = null;
  }

  deletePrompt(prompt: any) {
    // Kiểm tra xem prompt có câu hỏi không
    const questionCount = prompt.questions?.length || 0;

    this.pendingDeletePrompt = prompt;
    this.deletePromptTitle = '🗑️ Xác Nhận Xóa Prompt';
    
    if (questionCount > 0) {
      this.deletePromptMessage = `Prompt này chứa ${questionCount} câu hỏi.\n\nXóa prompt này sẽ vĩnh viễn xóa tất cả các câu hỏi và câu trả lời bên trong.\n\nBạn có chắc chắn muốn xóa không?`;
    } else {
      this.deletePromptMessage = `Bạn có chắc chắn muốn xóa prompt này không?`;
    }
    
    this.showDeletePromptPopup = true;
  }

  onConfirmDeletePrompt() {
    if (!this.pendingDeletePrompt) return;

    this.questionService.deletePrompt(this.pendingDeletePrompt.promptId).subscribe({
      next: (res) => {
        const msg = res?.message || 'Prompt deleted successfully!';
        this.showMessage(msg, 'success');
        this.loadPrompts();
      },
      error: (err) => {
        let errorMsg = 'Failed to delete prompt!';
        if (err?.error?.message) {
          errorMsg = err.error.message;
        } else if (typeof err?.error === 'string') {
          errorMsg = err.error;
        } else if (err?.message) {
          errorMsg = err.message;
        }
        this.showMessage(errorMsg, 'error');
      }
    });

    this.showDeletePromptPopup = false;
    this.pendingDeletePrompt = null;
  }

  onCancelDeletePrompt() {
    this.showDeletePromptPopup = false;
    this.pendingDeletePrompt = null;
  }

  //statistics
  questionStats: any = {};
  loadStatistics() {
    this.questionService.getStatistics().subscribe({
      next: (res) => {
        this.questionStats = res;
      },
      error: () => {
        this.questionStats = {
          totalQuestions: 0,
          usedQuestions: 0,
          unusedQuestions: 0,
        };
      },
    });
  }

  getMaxDisplayCount(): number {
    return Math.min(this.page * this.size, this.totalPages);
  }

  // Helper function để lấy thông báo lỗi validation
  getFormValidationErrors(form: FormGroup): string | null {
    const errors: string[] = [];
    
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      
      if (control && control.invalid && control.errors) {
        const fieldName = this.getFieldDisplayName(key);
        
        // Chỉ hiển thị lỗi đầu tiên cho mỗi field
        if (control.errors['required']) {
          errors.push(`${fieldName} không được để trống`);
        } else if (control.errors['whitespace']) {
          errors.push(`${fieldName} không được chỉ chứa khoảng trắng`);
        } else if (control.errors['meaninglessContent']) {
          errors.push(`${fieldName} phải chứa ít nhất một ký tự chữ hoặc số`);
        } else if (control.errors['repeatedCharacters']) {
          errors.push(`${fieldName} không được chỉ chứa ký tự lặp lại`);
        } else if (control.errors['min']) {
          errors.push(`${fieldName} phải lớn hơn hoặc bằng ${control.errors['min'].min}`);
        }
      }
      
      // Kiểm tra FormArray (như questions và options)
      if (control instanceof FormArray) {
        control.controls.forEach((arrayControl, index) => {
          if (arrayControl instanceof FormGroup) {
            Object.keys(arrayControl.controls).forEach(subKey => {
              const subControl = arrayControl.get(subKey);
              if (subControl && subControl.invalid && subControl.errors) {
                const subFieldName = this.getFieldDisplayName(subKey);
                
                // Chỉ hiển thị lỗi đầu tiên cho mỗi field
                if (subControl.errors['required']) {
                  errors.push(`${subFieldName} (${key} ${index + 1}) không được để trống`);
                } else if (subControl.errors['whitespace']) {
                  errors.push(`${subFieldName} (${key} ${index + 1}) không được chỉ chứa khoảng trắng`);
                } else if (subControl.errors['meaninglessContent']) {
                  errors.push(`${subFieldName} (${key} ${index + 1}) phải chứa ít nhất một ký tự chữ hoặc số`);
                } else if (subControl.errors['repeatedCharacters']) {
                  errors.push(`${subFieldName} (${key} ${index + 1}) không được chỉ chứa ký tự lặp lại`);
                }
              }
            });
          }
        });
      }
    });
    
    return errors.length > 0 ? errors.join('\n') : null;
  }

  // Helper function để chuyển tên field thành tên hiển thị tiếng Việt
  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      'title': 'Tiêu đề',
      'contentText': 'Nội dung',
      'stemText': 'Nội dung câu hỏi',
      'questionExplain': 'Giải thích',
      'content': 'Nội dung đáp án',
      'sampleAnswer': 'Câu trả lời mẫu',
      'scoreWeight': 'Điểm',
      'time': 'Thời gian',
      'questions': 'Câu hỏi',
      'options': 'Đáp án'
    };
    
    return displayNames[fieldName] || fieldName;
  }
}
