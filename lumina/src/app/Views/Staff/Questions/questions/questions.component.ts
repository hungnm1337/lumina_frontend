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
import { noWhitespaceValidator } from '../../../../../environments/custom-validators'; 

@Component({
  selector: 'app-questions',
  templateUrl: './questions.component.html',
  styleUrls: ['./questions.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
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
  editPromptForm !: FormGroup;
  message: string = '';
  messageType: string = 'success'; // hoặc 'error'

  constructor(
    private fb: FormBuilder,
    private examPartService: ExamPartService,
    private questionService: QuestionService,
    private mediaService: UploadService
  ) {
    this.promptForm = this.fb.group({
      contentText: ['',[Validators.required, noWhitespaceValidator()]],
      title: ['', [Validators.required, noWhitespaceValidator()]],
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

  initData(){
    this.examPartService.getExamsParts().subscribe(res => {
      this.parts = res || [];
      // ✅ Lấy danh sách ExamSetKey unique
      this.examSetKeys = Array.from(new Set(this.parts.map(p => p.examSetKey)));
      console.log('📋 ExamSetKeys:', this.examSetKeys);
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
  
  // ✅ Thêm biến cho ExamSetKey filter
  examSetKeys: string[] = [];
  selectedExamSetKey: string | null = null;
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
    console.log('🔍 ExamSetKey filter changed:', this.selectedExamSetKey);
    if (this.selectedExamSetKey) {
      this.filteredPartsForView = this.parts.filter(
        p => p.examSetKey === this.selectedExamSetKey
      );
      console.log('📋 Filtered parts for view:', this.filteredPartsForView);
    } else {
      this.filteredPartsForView = [];
    }
    // Reset selectedPartId khi đổi ExamSetKey
    this.selectedPartId = '';
    // Reset về trang 1 và load lại
    this.page = 1;
    this.loadPrompts();
  }

  onPartFilterChange() {
    console.log('🔍 Part filter changed:', this.selectedPartId);
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
      stemText: ['', Validators.required],
      questionExplain: [''],
      scoreWeight: [1, Validators.required],
      time: [30, Validators.required],
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

  createOption(): FormGroup {
    return this.fb.group({
      content: ['', Validators.required],
      isCorrect: [false],
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
  }

  uploadMedia(event: any, field: 'referenceImageUrl' | 'referenceAudioUrl') {
    const file = event.target.files[0];
    if (file) {
      this.mediaService.uploadFile(file).subscribe({
        next: (res) => {
          this.promptForm.patchValue({ [field]: res.url });
        },
        error: () => alert('Upload thất bại!'),
      });
    }
  }
  selectedSkill: string = '';
  filteredParts: any[] = [];
  selectedPartQuestionCount: number = 0;

  // Hard code số lượng câu hỏi theo Part
  private readonly partQuestionCounts: { [key: string]: number } = {
    'LISTENING_PART1': 1,
    'LISTENING_PART2': 1,
    'LISTENING_PART3': 3,
    'LISTENING_PART4': 3,
    'READING_PART6': 4,
    'READING_PART7': 3,
    'SPEAKING_PART1': 1,
    'SPEAKING_PART2': 1,
    'SPEAKING_PART3': 3,
    'SPEAKING_PART4': 4,
    'SPEAKING_PART5': 1,
    'WRITING_PART1': 1,
    'WRITING_PART2': 1,
    'WRITING_PART3': 1
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

onSkillChange(event: any): void {
  this.selectedSkill = event.target.value;
  
  console.log('=== onSkillChange ===');
  console.log('selectedSkill:', this.selectedSkill);
  
  // Xóa tất cả câu hỏi cũ
  while (this.questions.length !== 0) {
    this.questions.removeAt(0);
  }
  
  // Lọc parts theo skill
  this.filterPartsBySkill();
  
  // Reset partId và selectedPartQuestionCount
  this.promptForm.patchValue({ partId: '' });
  this.selectedPartQuestionCount = 0;
  
  // KHÔNG thêm câu hỏi mẫu nữa - chỉ thêm khi chọn Part
  // this.addQuestion();
  
  console.log('filteredParts:', this.filteredParts);
}

  filterPartsBySkill() {
    if (!this.selectedSkill) {
      this.filteredParts = [];
    } else {
      const skillUpper = this.selectedSkill.toUpperCase();
      this.filteredParts = this.parts.filter(p => {
        const partCodeUpper = p.partCode?.toUpperCase() || '';
        return partCodeUpper.includes(skillUpper);
      });
    }
  }

  onPartSelected(): void {
  const selectedPartId = this.promptForm.get('partId')?.value;
  
  console.log('=== DEBUG onPartSelected ===');
  console.log('selectedPartId:', selectedPartId);
  console.log('selectedPartId type:', typeof selectedPartId);
  console.log('this.parts:', this.parts);
  console.log('this.filteredParts:', this.filteredParts);
  
  // Tìm trong filteredParts thay vì this.parts
  const selectedPart = this.filteredParts.find(p => {
    console.log('Comparing:', p.partId, 'with', selectedPartId, 'equal?', p.partId == selectedPartId);
    return p.partId == selectedPartId; // Dùng == để so sánh cả string và number
  });
  
  console.log('selectedPart:', selectedPart);
  
  if (selectedPart && selectedPart.partCode) {
    const partCode = selectedPart.partCode.toUpperCase().trim();
    console.log('partCode (normalized):', partCode);
    console.log('partQuestionCounts:', this.partQuestionCounts);
    console.log('Looking for key:', partCode);
    
    this.selectedPartQuestionCount = this.partQuestionCounts[partCode] || 0;
    console.log('selectedPartQuestionCount:', this.selectedPartQuestionCount);
    
    if (this.selectedPartQuestionCount > 0) {
      this.adjustQuestionsToMatch(this.selectedPartQuestionCount);
    } else {
      console.warn('Không tìm thấy số lượng câu hỏi cho partCode:', partCode);
      console.warn('Các key có sẵn:', Object.keys(this.partQuestionCounts));
      this.adjustQuestionsToMatch(1);
    }
  } else {
    console.log('Không tìm thấy part hoặc partCode');
    console.log('selectedPart:', selectedPart);
    this.selectedPartQuestionCount = 0;
    this.adjustQuestionsToMatch(1);
  }
  console.log('=== END DEBUG ===');
}

  private adjustQuestionsToMatch(count: number): void {
    console.log('=== adjustQuestionsToMatch ===');
    console.log('Target count:', count);
    console.log('Current questions length:', this.questions.length);
    
    while (this.questions.length !== 0) {
      this.questions.removeAt(0);
    }
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        this.addQuestion();
      }
      console.log('Đã thêm', count, 'câu hỏi');
      console.log('New questions length:', this.questions.length);
    } else {
      console.log('Count = 0, không thêm câu hỏi');
    }
  }

  savePrompt() {
    if (this.promptForm.invalid) {
      alert('Vui lòng nhập đủ thông tin');
      return;
    }

    const f = this.promptForm.value;

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
          const correctCount = q.options.filter((opt: any) => opt.isCorrect).length;
          questionType = correctCount === 1 ? 'SINGLE_CHOICE' : 'MULTIPLE_CHOICE';
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
          options: (f.skill === 'Speaking' || f.skill === 'Writing')
            ? []
            : (q.options || []).map((opt: any) => ({
              content: opt.content,
              isCorrect: !!opt.isCorrect,
            }))
        };
      })
    };
    console.log('Submitting DTO:', dto);

    this.questionService.createPromptWithQuestions(dto).subscribe({
      next: res => {
        alert('Tạo mới prompt thành công!');
        this.closeModal();
        this.loadPrompts();
      },
      error: (err) => {
        let errorMsg = 'Có lỗi xảy ra';
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
        alert('Lỗi: ' + errorMsg);
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
        next: () => {
          alert('Import thành công!');
          this.closeImportModal();
          this.initData();
        },
        error: (err) => {
          let errorMsg = 'Lỗi import file excel!';
          if (err.error && err.error.error) {
            errorMsg = err.error.error;
          } else if (err.error && typeof err.error === 'string') {
            errorMsg = err.error;
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
      title: [prompt.title, [Validators.required, noWhitespaceValidator()]],
      contentText: [prompt.contentText, [Validators.required, noWhitespaceValidator()]],
      skill: [prompt.skill || '', Validators.required],
      promptText: [prompt.promptText || ''],
      referenceImageUrl: [prompt.referenceImageUrl || ''],
      referenceAudioUrl: [prompt.referenceAudioUrl || '']
    });
  }




  // Hàm lưu khi submit modal
  saveEditPrompt() {
    if (this.editPromptForm.invalid) {
      alert('Vui lòng điền đầy đủ thông tin');
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
    console.log('openModalAdd - currentPartId:', this.currentPartId);
    const formObj: any = {
      stemText: ['', [Validators.required, noWhitespaceValidator()]],
      questionExplain: [''],
      scoreWeight: [1, Validators.required],
      time: [30, Validators.required]
    };

    if (this.currentSkill !== 'Speaking' && this.currentSkill !== 'Writing' && this.currentSkill !== 'SPEAKING' && this.currentSkill !== 'WRITING') {
      formObj.options = this.fb.array([
        this.createOption(), this.createOption(), this.createOption(), this.createOption()
      ]);
    }
    this.questionForm = this.fb.group(formObj);
  }




  // Mở modal để sửa câu hỏi (truyền dữ liệu cũ vào form)
  editQuestionIdx: number | null = null;

  currentPartId: number | null = null;

  currentPromptId: number | null = null;

  editQuestion(q: any, prompt: any) {
    this.isEditQuestion = true;
    this.editQuestionIdx = q.questionId;
    this.currentPartId = prompt.partId;
    this.currentPromptId = prompt.promptId;
    this.isQuestionModalOpen = true;
    // Lấy skill đúng từ prompt trả về từ API
    this.currentSkill = prompt.skill || '';

    const formObj: any = {
      stemText: [q.stemText, Validators.required],
      questionExplain: [q.questionExplain || ''],
      scoreWeight: [q.scoreWeight ?? 1, Validators.required],
      time: [q.time ?? 30, Validators.required]
    };

    if (this.currentSkill !== 'Speaking' && this.currentSkill !== 'Writing' && this.currentSkill !== 'SPEAKING' && this.currentSkill !== 'WRITING') {
      formObj.options = this.fb.array(
        (q.options && q.options.length ? q.options : [1, 2, 3, 4]).map((opt: any) =>
          this.fb.group({
            content: [opt?.content || '', Validators.required],
            isCorrect: [!!opt?.isCorrect]
          })
        )
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

  // Xử lý submit
  // Thêm mới câu hỏi
  saveQuestion() {
    if (this.questionForm.invalid) {
      this.showMessage('Vui lòng nhập đủ thông tin!', 'error');
      return;
    }
    const value = this.questionForm.value;

    if (!this.currentPartId) {
      this.showMessage('Vui lòng chọn PartId hợp lệ!', 'error');
      return;
    }

    let questionType = 'SINGLE_CHOICE';
    if (this.currentSkill === 'Speaking') {
      questionType = 'SPEAKING';
    } else if (this.currentSkill === 'Writing') {
      questionType = 'WRITING';
    } else if (Array.isArray(value.options)) {
      const correctOptionCount = value.options.filter((opt: any) => opt.isCorrect).length;
      questionType = correctOptionCount === 1 ? 'SINGLE_CHOICE' : 'MULTIPLE_CHOICE';
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

    if (
      this.currentSkill !== 'Speaking' &&
      this.currentSkill !== 'Writing' &&
      Array.isArray(value.options)
    ) {
      dto.options = value.options.map((opt: any) => ({
        content: opt.content,
        isCorrect: !!opt.isCorrect,
      }));
    } else {
      dto.options = [];
    }

    console.log('Sending DTO:', dto);

    const apiCall = this.isEditQuestion && this.editQuestionIdx !== null
      ? this.questionService.editQuestion(dto)
      : this.questionService.addQuestion(dto);

    apiCall.subscribe({
      next: (res) => {
        this.showMessage(
          res?.message || (this.isEditQuestion ? 'Sửa câu hỏi thành công!' : 'Thêm câu hỏi thành công!'),
          'success'
        );
        this.isQuestionModalOpen = false;
        this.loadPrompts();
      },
      error: (err) => {
        const errorMsg = err.error?.message || err.error?.error || 'Part đã đủ số lượng câu hỏi!';
        this.showMessage(errorMsg, 'error');
      }
    });
  }


 deleteQuestion(q: any) {
  if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
    this.questionService.deleteQuestion(q.questionId).subscribe({
      next: (res) => {
        // Ưu tiên show message từ backend (dạng object hoặc string)
        const msg = res?.message
          ? res.message
          : (typeof res === 'string' ? res : 'Xóa câu hỏi thành công!');
        this.showMessage(msg, 'success');
        this.loadPrompts();
      },
      error: (err) => {
        let msg = 'Xóa câu hỏi thất bại!';
        // Ưu tiên err.error.message nếu có, tiếp đến err.error dạng string
        if (err?.error?.message) msg = err.error.message;
        else if (typeof err?.error === 'string') msg = err.error;
        this.showMessage(msg, 'error');
      },
    });
  }
}



  //statistics
  questionStats: any = {};
  loadStatistics() {
    this.questionService.getStatistics().subscribe({
      next: (res) => {
        this.questionStats = res;
      },
      error: () => {
        this.questionStats = { totalQuestions: 0, usedQuestions: 0, unusedQuestions: 0 };
      }
    });
  }
}
