import { ExamPartService } from './../../../../Services/ExamPart/exam-part.service';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { QuestionService } from '../../../../Services/Question/question.service';
import { CommonModule } from '@angular/common';
import { UploadService } from '../../../../Services/Upload/upload.service';

@Component({
  selector: 'app-questions',
  templateUrl: './questions.component.html',
  styleUrls: ['./questions.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule]
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
  message: string = '';
  messageType: string = 'success'; // hoặc 'error'


  constructor(
    private fb: FormBuilder,
    private examPartService: ExamPartService,
    private questionService: QuestionService,
    private mediaService: UploadService
  ) {
    this.promptForm = this.fb.group({
      passageTitle: [''],
      passageContent: [''],
      promptText: ['', Validators.required],
      skill: ['', Validators.required],
      partId: ['', Validators.required],
      promptId: [null], 
      referenceImageUrl: [''], // có thể null hoặc ''
      referenceAudioUrl: [''], // có thể null hoặc ''
      questions: this.fb.array([])
    });
    this.addQuestion(); // khởi tạo 1 question mẫu
  }

  ngOnInit(): void {
    this.examPartService.getExamParts().subscribe(res => {
      this.parts = res || [];
    });
    this.loadPassages();
  }

  passages: any[] = [];
  page = 1;
  size = 10;
  totalPages = 0;
  selectedPartId: number | '' = '';
  loading = false;
  uploading = false;


  // Lấy danh sách câu hỏi từ API, hỗ trợ filter, search, paging
  loadPassages() {
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
        this.passages = res.items || [];
        this.totalPages = res.totalPages || 1;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }



  onPartFilterChange() {
    this.page = 1;
    this.loadPassages();
  }
  onPageChange(newPage: number) {
    this.page = newPage;
    this.loadPassages();
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
      next: res => {
        if (res && res.url) {
          this.uploadedUrl = res.url;
        }
        this.uploading = false;
      },
      error: () => {
        this.uploading = false;
        alert('Upload thất bại!');
      }
    });
  }

  // Copy url vào clipboard
  copyUrl(url: string) {
    navigator.clipboard.writeText(url);
  }


  addQuestion() {
    this.questions.push(this.fb.group({
      stemText: ['', Validators.required],
      questionExplain: [''],
      options: this.fb.array([
        this.createOption(),
        this.createOption(),
        this.createOption(),
        this.createOption(),
      ])
    }));
  }

  removeQuestion(index: number) {
    this.questions.removeAt(index);
  }

  createOption(): FormGroup {
    return this.fb.group({
      content: ['', Validators.required],
      isCorrect: [false]
    });
  }

  getOptions(qIdx: number): FormArray {
    return (this.questions.at(qIdx).get('options') as FormArray);
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
        next: res => {
          this.promptForm.patchValue({ [field]: res.url });
        },
        error: () => alert('Upload thất bại!')
      });
    }
  }



  savePrompt() {
    if (this.promptForm.invalid) {
      alert('Vui lòng nhập đủ thông tin');
      return;
    }
    // Build đúng DTO cho API:
    const f = this.promptForm.value;
    const dto = {
      Passage: {
        Title: f.passageTitle,
        ContentText: f.passageContent,
      },
      Prompt: {
        Skill: f.skill,
        PromptText: f.promptText,
        ReferenceImageUrl: f.referenceImageUrl,   // BỔ SUNG TRƯỜNG NÀY
        ReferenceAudioUrl: f.referenceAudioUrl,   // BỔ SUNG TRƯỜNG NÀY

      },
      Questions: f.questions.map((q: any) => ({
        Question: {
          PartId: f.partId,
          QuestionType: "SINGLE_CHOICE",
          StemText: q.stemText,
          ScoreWeight: 1,
          QuestionExplain: q.questionExplain,
          Time: 30,
          QuestionNumber: 1
        },
        Options: q.options.map((opt: any) => ({
          Content: opt.content,
          IsCorrect: !!opt.isCorrect
        }))
      }))
    };

    this.questionService.createPromptWithQuestions(dto)
      .subscribe({
        next: res => {
          alert('Tạo thành công!');
          this.closeModal();
        },
        error: err => {
          // Xử lý lấy message chi tiết trả về từ backend
          let errorMsg = 'Có lỗi xảy ra';
          if (err.error && err.error.error) {
            errorMsg = err.error.error;
          } else if (err.error) {
            errorMsg = typeof err.error === "string" ? err.error : JSON.stringify(err.error);
          } else if (err.message) {
            errorMsg = err.message;
          }
          alert('Lỗi: ' + errorMsg);
        }
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
    this.questionService.importQuestionsExcel(this.excelFile, this.importPartId)
      .subscribe({
        next: () => {
          alert('Import thành công!');
          this.closeImportModal();
        },
        error: err => {
          let errorMsg = 'Lỗi import file excel!';
          if (err.error && err.error.error) {
            errorMsg = err.error.error;
          } else if (err.error && typeof err.error === "string") {
            errorMsg = err.error;
          }
          alert('Lỗi: ' + errorMsg);
        }
      });
  }



  toggleShowQuestions(passage: any) {
    passage.showQuestions = !passage.showQuestions;
  }




  // Mở modal và load dữ liệu passage, prompt vào form
  editPassage(passage: any) {
    this.isEditModalOpen = true;
    this.editPassageForm = this.fb.group({
      passageId: [passage.passageId],
      title: [passage.title, Validators.required],
      contentText: [passage.contentText, Validators.required],
      prompt: this.fb.group({
        promptId: [passage.prompt?.promptId || null],
        skill: [passage.prompt?.skill || '', Validators.required],
        promptText: [passage.prompt?.promptText || ''],
        referenceImageUrl: [passage.prompt?.referenceImageUrl || ''],
        referenceAudioUrl: [passage.prompt?.referenceAudioUrl || '']
      })
    });
  }

  // Hàm lưu khi submit modal
  saveEditPassage() {
    if (this.editPassageForm.invalid) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }
    const dto = this.editPassageForm.value;
    this.questionService.editPassage(dto).subscribe({
      next: () => {
       this.showMessage('Cập nhật thành công!', 'success');
        this.isEditModalOpen = false;
        this.loadPassages(); // reload lại danh sách
      },
      error: () => alert('Có lỗi khi cập nhật passage')
    });
  }

  // Đóng modal
  closeEditModal() {
    this.isEditModalOpen = false;
  }

  showMessage(msg: string, type: 'success' | 'error' = 'success') {
  this.message = msg;
  this.messageType = type;
  setTimeout(() => this.message = '', 3000); // tự động ẩn sau 3s
}

isQuestionModalOpen = false;
questionForm!: FormGroup;
isEditQuestion = false;
editQuestionIndex: number|null = null;

// Mở modal để thêm câu hỏi mới
openModalAdd() {
  this.isEditQuestion = false;
  this.isQuestionModalOpen = true;
  this.questionForm = this.fb.group({
    stemText: ['', Validators.required],
    questionExplain: [''],
    scoreWeight: [1, Validators.required],
    time: [30, Validators.required],
    options: this.fb.array([
      this.createOption(), this.createOption(), this.createOption(), this.createOption()
    ])
  });
}

// Mở modal để sửa câu hỏi (truyền dữ liệu cũ vào form)
editQuestionIdx: number | null = null;

currentPartId: number | null = null;

currentPromptId: number | null = null;

editQuestion(q: any, prompt: any) {
  this.isEditQuestion = true;
  this.editQuestionIdx = q.questionId;
  this.currentPartId = prompt.partId; // lấy partId ở đây
  this.currentPromptId = prompt.promptId;

  this.isQuestionModalOpen = true;
  this.questionForm = this.fb.group({
    stemText: [q.stemText, Validators.required],
    questionExplain: [q.questionExplain || ''],
    scoreWeight: [q.scoreWeight ?? 1, Validators.required],
    time: [q.time ?? 30, Validators.required],
    options: this.fb.array(
      (q.options && q.options.length ? q.options : [1,2,3,4]).map((opt: any) =>
        this.fb.group({
          content: [opt?.content || '', Validators.required],
          isCorrect: [!!opt?.isCorrect]
        })
      )
    )
  });
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

  const correctOptionCount = value.options.filter((opt: any) => opt.isCorrect).length;
  const questionType = correctOptionCount === 1 ? 'SINGLE_CHOICE' : 'MULTIPLE_CHOICE';

  const dto = {
    questionId: this.isEditQuestion ? this.editQuestionIdx : null,
    partId: this.currentPartId,
    promptId: this.currentPromptId,
    stemText: value.stemText,
    questionExplain: value.questionExplain,
    scoreWeight: +value.scoreWeight,
    time: +value.time,
    questionType: questionType,
    options: value.options.map((opt: any) => ({
      content: opt.content,
      isCorrect: !!opt.isCorrect
    }))
  };

  // Gọi API tiếp theo


  console.log('Sending DTO:', dto);

  if (this.isEditQuestion && this.editQuestionIdx !== null) {
    this.questionService.editQuestion(dto).subscribe({
      next: (res) => {
        this.showMessage(res?.message || 'Sửa câu hỏi thành công!', 'success');
        this.isQuestionModalOpen = false;
        this.loadPassages();
      },
      error: (err) => {
        this.showMessage(err.error?.message || 'Sửa câu hỏi thất bại!', 'error');
      }
    });
  } else {
    this.questionService.addQuestion(dto).subscribe({
      next: (res) => {
        this.showMessage(res?.message || 'Thêm câu hỏi thành công!', 'success');
        this.isQuestionModalOpen = false;
        this.loadPassages();
      },
      error: (err) => {
        this.showMessage(err.error?.message || 'Thêm câu hỏi thất bại!', 'error');
      }
    });
  }
}







// Xóa question (với xác nhận)
deleteQuestion(q: any) {
  if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
    this.questionService.deleteQuestion(q.questionId).subscribe({
      next: (res) => {
        this.showMessage(res?.message || 'Xóa câu hỏi thành công!', 'success');
        this.loadPassages();
      },
      error: (err) => {
        this.showMessage(err.error?.message || 'Xóa câu hỏi thất bại!', 'error');
      }
    });
  }
}




}
