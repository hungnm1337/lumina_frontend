import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExamPartService } from '../../../../Services/ExamPart/exam-part.service';
import { FormsModule } from '@angular/forms';
import { QuestionService } from '../../../../Services/Question/question.service';
import { UploadService } from '../../../../Services/Upload/upload.service';

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './preview-panel.component.html',
  styleUrl: './preview-panel.component.scss'
})
export class PreviewPanelComponent implements OnInit, OnDestroy, OnChanges {
  @Input() previewData: any = null;
  examParts: any[] = [];
  examSetKeys: string[] = [];
  selectedExamSetKey: string | null = null;
  filteredParts: any[] = [];
  selectedPartId: number | null = null;
  isLoadingParts = true;
  isSaving = false;
  showToast = false;
  toastMessage = '';

  constructor(
    private examPartService: ExamPartService, 
    private questionService: QuestionService, 
    private uploadService: UploadService
  ) {}

  ngOnInit() {
    this.loadExamParts();
  }

  // ✅ Khi previewData thay đổi (xem preview khác), reset selectors
  ngOnChanges(changes: SimpleChanges) {
    if (changes['previewData'] && !changes['previewData'].firstChange) {
      console.log('🔄 Preview data changed, resetting selectors...');
      this.resetSelectors();
    }
  }

  ngOnDestroy() {
    this.resetSelectors();
  }

  loadExamParts() {
    console.log('🔄 Loading exam parts...');
    this.isLoadingParts = true;
    
    this.examPartService.getExamsParts().subscribe({
      next: (parts: any[]) => {
        console.log('✅ Exam parts loaded:', parts);
        this.examParts = parts;
        this.examSetKeys = Array.from(new Set(parts.map(p => p.examSetKey)));
        console.log('📋 ExamSetKeys:', this.examSetKeys);
        this.isLoadingParts = false;
      },
      error: (err) => {
        console.error('❌ Error loading exam parts:', err);
        this.isLoadingParts = false;
      }
    });
  }

  onExamSetKeyChange() {
    console.log('🔍 ExamSetKey changed:', this.selectedExamSetKey);
    if (this.selectedExamSetKey) {
      this.filteredParts = this.examParts.filter(
        p => p.examSetKey === this.selectedExamSetKey
      );
      console.log('📋 Filtered parts:', this.filteredParts);
    } else {
      this.filteredParts = [];
    }
    this.selectedPartId = null;
  }

  onPartChange() {
    console.log('✅ Part selected:', this.selectedPartId);
  }

  async onSaveExam() {
    if (!this.selectedExamSetKey || !this.selectedPartId) {
      console.error('❌ Chưa chọn đủ thông tin');
      this.showToastMessage('⚠️ Vui lòng chọn đầy đủ Exam Set và Part!');
      return;
    }

    if (!this.previewData || this.previewData.length === 0) {
      console.error('❌ Không có dữ liệu đề thi để lưu');
      this.showToastMessage('⚠️ Không có dữ liệu để lưu!');
      return;
    }

    this.isSaving = true;

    try {
      // BƯỚC 1: Đếm tổng số câu hỏi
      let totalQuestions = 0;
      
      console.log('🔍 Preview Data:', this.previewData);
      
      for (const prompt of this.previewData) {
        console.log('🔍 Prompt:', prompt);
        
        if (prompt.Questions && Array.isArray(prompt.Questions)) {
          totalQuestions += prompt.Questions.length;
          console.log(`  ✅ Tìm thấy ${prompt.Questions.length} câu hỏi trong Questions`);
        } 
        else if (prompt.questions && Array.isArray(prompt.questions)) {
          totalQuestions += prompt.questions.length;
          console.log(`  ✅ Tìm thấy ${prompt.questions.length} câu hỏi trong questions`);
        }
        else if (prompt.Question && Array.isArray(prompt.Question)) {
          totalQuestions += prompt.Question.length;
          console.log(`  ✅ Tìm thấy ${prompt.Question.length} câu hỏi trong Question`);
        }
        else if (prompt.questionCount) {
          totalQuestions += prompt.questionCount;
          console.log(`  ✅ Tìm thấy ${prompt.questionCount} câu hỏi từ questionCount`);
        }
        else {
          console.warn('  ⚠️ Không tìm thấy câu hỏi trong prompt này');
        }
      }

      console.log('📊 Tổng số câu hỏi cần thêm:', totalQuestions);

      if (totalQuestions === 0) {
        this.isSaving = false;
        this.showToastMessage('⚠️ Không tìm thấy câu hỏi nào để lưu!');
        return;
      }

      // BƯỚC 2: Kiểm tra slot khả dụng
      const checkResponse = await this.questionService
        .checkAvailableSlots(this.selectedPartId, totalQuestions)
        .toPromise();

      if (!checkResponse?.canAdd) {
        this.isSaving = false;
        this.showToastMessage('❌ ' + (checkResponse?.error || 'Không đủ slot để thêm câu hỏi!'));
        return;
      }

      // BƯỚC 3: Upload file sau khi đã kiểm tra
      for (const prompt of this.previewData) {
        if (prompt.referenceImageUrl && prompt.referenceImageUrl.trim() !== '') {
          const imageUploadRes = await this.uploadService.uploadFromUrl(prompt.referenceImageUrl).toPromise();
          if (imageUploadRes && imageUploadRes.url) {
            prompt.referenceImageUrl = imageUploadRes.url; 
          }
        }

        if (prompt.referenceAudioUrl && prompt.referenceAudioUrl.trim() !== '') {
          const audioUploadRes = await this.uploadService.generateAudioFromText(prompt.referenceAudioUrl).toPromise();
          if (audioUploadRes && audioUploadRes.url) {
            prompt.referenceAudioUrl = audioUploadRes.url;
          }
        }
      }

      // BƯỚC 4: Lưu dữ liệu
      const payload = {
        prompts: this.previewData,
        partId: this.selectedPartId
      };

      this.questionService.savePromptsWithQuestions(payload).subscribe({
        next: (res) => {
          console.log('✅ Lưu đề thi thành công', res);
          this.isSaving = false;
          this.showToastMessage('✅ Lưu đề thi thành công!');
          
          // ✅ Reset selectors sau khi save thành công
          setTimeout(() => {
            this.resetSelectors();
          }, 1500);
        },
        error: (err) => {
          console.error('❌ Lưu đề thi thất bại', err);
          this.isSaving = false;
          this.showToastMessage('❌ Lưu đề thi thất bại!');
        }
      });
    } catch (error: any) {
      console.error('❌ Lỗi khi xử lý:', error);
      this.isSaving = false;
      this.showToastMessage('❌ ' + (error?.error?.error || 'Có lỗi xảy ra!'));
    }
  }

  // ✅ Hàm reset tất cả selectors
  resetSelectors() {
    console.log('🔄 Resetting selectors...');
    this.selectedExamSetKey = null;
    this.selectedPartId = null;
    this.filteredParts = [];
  }

  showToastMessage(message: string) {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
