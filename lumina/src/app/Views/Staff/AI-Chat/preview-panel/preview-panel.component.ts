import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
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
  styleUrls: ['./preview-panel.component.scss']
})
export class PreviewPanelComponent implements OnInit, OnDestroy, OnChanges {
  @Input() previewData: any = null;
  @Output() savingStateChange = new EventEmitter<boolean>();
  
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

  // Khi previewData thay đổi (xem preview khác), reset selectors
  ngOnChanges(changes: SimpleChanges) {
    if (changes['previewData'] && !changes['previewData'].firstChange) {
      this.resetSelectors();
    }
  }

  ngOnDestroy() {
    this.resetSelectors();
  }

  loadExamParts() {

    this.isLoadingParts = true;

    this.examPartService.getExamsParts().subscribe({
      next: (parts: any[]) => {
        this.examParts = parts;
        
        // Lấy unique examSetKeys và sắp xếp: MockTest đầu tiên, còn lại giảm dần theo tháng-năm
        const uniqueKeys = Array.from(new Set(parts.map(p => p.examSetKey)));
        
        // Tách MockTest và các kỳ đề khác
        const mockTest = uniqueKeys.filter(key => key === 'MockTest');
        const otherKeys = uniqueKeys.filter(key => key !== 'MockTest');
        
        // Sắp xếp các kỳ đề (không phải MockTest) GIẢM DẦN theo năm-tháng (mới nhất trước)
        const sortedOtherKeys = otherKeys.sort((a, b) => {
          // Format: MM-YYYY
          const [monthA, yearA] = a.split('-').map(Number);
          const [monthB, yearB] = b.split('-').map(Number);
          
          // So sánh năm trước (giảm dần), nếu bằng nhau thì so sánh tháng (giảm dần)
          if (yearA !== yearB) {
            return yearB - yearA; // Năm mới hơn lên trước
          }
          return monthB - monthA; // Tháng mới hơn lên trước
        });
        
        // MockTest đầu tiên, sau đó là các kỳ đề giảm dần
        this.examSetKeys = [...mockTest, ...sortedOtherKeys];
        
        console.log('ExamSetKeys (sorted):', this.examSetKeys);
        this.isLoadingParts = false;
      },
      error: (err) => {
        console.error('Error loading exam parts:', err);
        this.isLoadingParts = false;
      }
    });
  }

  onExamSetKeyChange() {
    console.log('ExamSetKey changed:', this.selectedExamSetKey);
    if (this.selectedExamSetKey) {
      this.filteredParts = this.examParts.filter(
        p => p.examSetKey === this.selectedExamSetKey
      );
      console.log('Filtered parts:', this.filteredParts);
    } else {
      this.filteredParts = [];
    }
    this.selectedPartId = null;
  }

  onPartChange() {
    console.log('Part selected:', this.selectedPartId);
  }

  async onSaveExam() {
    if (!this.selectedExamSetKey || !this.selectedPartId) {
      console.error('Chưa chọn đủ thông tin');
      this.showToastMessage('Vui lòng chọn đầy đủ Exam Set và Part!');
      return;
    }

    if (!this.previewData || this.previewData.length === 0) {
      console.error('Không có dữ liệu đề thi để lưu');
      this.showToastMessage('Không có dữ liệu để lưu!');
      return;
    }

    this.isSaving = true;
    this.savingStateChange.emit(true);

    try {
      // BƯỚC 1: Đếm tổng số câu hỏi
      let totalQuestions = 0;

      console.log('Preview Data:', this.previewData);

      for (const prompt of this.previewData) {
        console.log('Prompt:', prompt);

        if (prompt.Questions && Array.isArray(prompt.Questions)) {
          totalQuestions += prompt.Questions.length;
          console.log(`  Tìm thấy ${prompt.Questions.length} câu hỏi trong Questions`);
        }
        else if (prompt.questions && Array.isArray(prompt.questions)) {
          totalQuestions += prompt.questions.length;
          console.log(`  Tìm thấy ${prompt.questions.length} câu hỏi trong questions`);
        }
        else if (prompt.Question && Array.isArray(prompt.Question)) {
          totalQuestions += prompt.Question.length;
          console.log(`  Tìm thấy ${prompt.Question.length} câu hỏi trong Question`);
        }
        else if (prompt.questionCount) {
          totalQuestions += prompt.questionCount;
          console.log(`  Tìm thấy ${prompt.questionCount} câu hỏi từ questionCount`);
        }
        else {
          console.warn('  Không tìm thấy câu hỏi trong prompt này');
        }
      }

      console.log('Tổng số câu hỏi cần thêm:', totalQuestions);

      if (totalQuestions === 0) {
        this.isSaving = false;
        this.savingStateChange.emit(false);
        this.showToastMessage('Không tìm thấy câu hỏi nào để lưu!');
        return;
      }

      // BƯỚC 2: Kiểm tra slot khả dụng
      const checkResponse = await this.questionService
        .checkAvailableSlots(this.selectedPartId, totalQuestions)
        .toPromise();

      if (!checkResponse?.canAdd) {
        this.isSaving = false;
        this.savingStateChange.emit(false);
        this.showToastMessage((checkResponse?.error || 'Không đủ slot để thêm câu hỏi!'));
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
          const audioUploadRes = await this.uploadService.generateAudio(prompt.referenceAudioUrl).toPromise();
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
          console.log('Lưu đề thi thành công', res);
          this.isSaving = false;
          this.savingStateChange.emit(false);
          this.showToastMessage('Lưu đề thi thành công!');

          // Reset selectors sau khi save thành công
          setTimeout(() => {
            this.resetSelectors();
          }, 1500);
        },
        error: (err) => {
          console.error('Lưu đề thi thất bại', err);
          this.isSaving = false;
          this.savingStateChange.emit(false);
          this.showToastMessage('Lưu đề thi thất bại!');
        }
      });
    } catch (error: any) {
      console.error('Lỗi khi xử lý:', error);
      this.isSaving = false;
      this.savingStateChange.emit(false);
      this.showToastMessage((error?.error?.error || 'Có lỗi xảy ra!'));
    }
  }

  // Reset all selectors
  resetSelectors() {
    console.log('Resetting selectors...');
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

  // Handle when image loads successfully
  onImageLoad(prompt: any) {
    console.log('Image loaded successfully');
    prompt._imageLoaded = true;
    prompt._imageError = false;
  }

  // Handle when image fails to load
  onImageError(prompt: any) {
    console.error('Image failed to load');
    prompt._imageLoaded = false;
    prompt._imageError = true;
  }

  // Retry loading image
  retryImageLoad(prompt: any) {
    console.log('Retrying image load...');
    prompt._imageLoaded = false;
    prompt._imageError = false;
    
    // Force reload bằng cách thêm timestamp
    const originalUrl = prompt.referenceImageUrl.split('?')[0];
    prompt.referenceImageUrl = `${originalUrl}?retry=${Date.now()}`;
  }
}
