import { Component, Input, OnInit } from '@angular/core';
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
export class PreviewPanelComponent implements OnInit {
  @Input() previewData: any = null;
  examParts: any[] = [];
  examSetKeys: string[] = [];
  selectedExamSetKey: string | null = null;
  filteredParts: any[] = [];
  selectedPartId: number | null = null;
  isLoadingParts = true;
  isSaving = false;
  showToast = false; // ✅ Flag hiển thị toast
  toastMessage = ''; // ✅ Nội dung toast

  constructor(private examPartService: ExamPartService, private questionService: QuestionService, private uploadService: UploadService) {}

  ngOnInit() {
    this.loadExamParts();
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
      for (const prompt of this.previewData) {
        // ✅ Kiểm tra referenceImageUrl có giá trị không trước khi upload
        if (prompt.referenceImageUrl && prompt.referenceImageUrl.trim() !== '') {
          const imageUploadRes = await this.uploadService.uploadFromUrl(prompt.referenceImageUrl).toPromise();
          if (imageUploadRes && imageUploadRes.url) {
            prompt.referenceImageUrl = imageUploadRes.url; 
          }
        }

        // ✅ Kiểm tra referenceAudioUrl có giá trị không trước khi upload
        if (prompt.referenceAudioUrl && prompt.referenceAudioUrl.trim() !== '') {
          const audioUploadRes = await this.uploadService.generateAudioFromText(prompt.referenceAudioUrl).toPromise();
          if (audioUploadRes && audioUploadRes.url) {
            prompt.referenceAudioUrl = audioUploadRes.url;
          }
        }
      }

      const payload = {
        prompts: this.previewData,
        partId: this.selectedPartId
      };

      this.questionService.savePromptsWithQuestions(payload).subscribe({
        next: (res) => {
          console.log('✅ Lưu đề thi thành công', res);
          this.isSaving = false;
          this.showToastMessage('✅ Lưu đề thi thành công!');
        },
        error: (err) => {
          console.error('❌ Lưu đề thi thất bại', err);
          this.isSaving = false;
          this.showToastMessage('❌ Lưu đề thi thất bại!');
        }
      });
    } catch (error) {
      console.error('❌ Lỗi khi upload hoặc lưu:', error);
      this.isSaving = false;
      this.showToastMessage('❌ Có lỗi xảy ra khi xử lý!');
    }
  }

  // ✅ Hàm hiển thị toast notification
  showToastMessage(message: string) {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000); // Ẩn sau 3 giây
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
