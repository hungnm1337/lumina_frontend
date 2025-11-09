import { Component, OnInit } from '@angular/core';
import { ExamService } from '../../../Services/Exam/exam.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-exams',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exams.component.html',
  styleUrls: ['./exams.component.scss']
})
export class ExamsComponent implements OnInit {
  allExamGroups: any[] = []; // Mảng để lưu trữ tất cả các group gốc
  examGroups: any[] = [];    // Mảng để hiển thị trên giao diện (sẽ bị thay đổi bởi filter)
  
  showMonths = 3;
  message = '';
  messageType: 'success' | 'error' = 'success';

  // Thuộc tính cho filter
  searchName: string = '';
  selectedSetKey: string = '';
  examSetKeys: string[] = [];

  constructor(private examService: ExamService) { }

  ngOnInit(): void {
    this.loadExamsGroupedByMonth();
  }

  loadExamsGroupedByMonth() {
    this.examService.getAllExamsWithParts().subscribe({
      next: (data) => {
        // Lưu dữ liệu gốc và dữ liệu để hiển thị
        this.allExamGroups = data;
        this.examGroups = data;

        // Tạo danh sách các key (tháng-năm) duy nhất để hiển thị trong dropdown filter
        // Sử dụng Set để đảm bảo các giá trị không bị trùng lặp
        this.examSetKeys = [...new Set(data.map((group: any) => group.examSetKey))];
        
        // Cập nhật lại danh sách hiển thị ban đầu, có thể không cần nếu không có pagination phức tạp
        this.updateVisibleGroups(); 
      },
      error: (err) => {
        console.error('Lỗi khi tải bài thi:', err);
      }
    });
  }

  updateVisibleGroups() {
    // Hàm này giờ sẽ được xử lý bởi filterExams và logic slice trong HTML
    // Chúng ta có thể gọi filterExams() ở đây để áp dụng bộ lọc mặc định nếu có
    this.filterExams();
  }

  onLoadMore() {
    this.showMonths += 3;
  }

  openExamModal(exam?: any) {
    console.log('Mở modal bài thi:', exam);
  }

  toggleExamStatus(exam: any) {
    const confirmMsg = exam.isActive
      ? 'Bạn có chắc muốn khóa bài thi này?'
      : 'Bạn có chắc muốn mở khóa bài thi này?';
    if (!window.confirm(confirmMsg)) return;

    this.examService.toggleExamStatus(exam.examId).subscribe({
      next: (res: any) => {
        exam.isActive = !exam.isActive;
        this.showMessage(res?.message || (exam.isActive ? 'Mở khóa thành công!' : 'Khóa bài thi thành công!'), 'success');
      },
      error: (err) => {
        let msg = 'Có lỗi khi đổi trạng thái bài thi';
        if (err?.error?.message) msg = err.error.message;
        this.showMessage(msg, 'error');
        console.error('Lỗi khi thay đổi trạng thái bài thi:', err);
      }
    });
  }

  // --- Logic tạo bài thi ---
  showCreateExamModal = false;
  createMonth = (new Date().getMonth() + 1);
  createYear = new Date().getFullYear();
  validYears = [2025, 2026, 2027, 2028, 2029, 2030];
  
  onCreateExam() {
    const mm = this.createMonth < 10 ? '0' + this.createMonth : this.createMonth;
    const toSetKey = `${mm}-${this.createYear}`;
    this.createExamForMonth(toSetKey);
    this.showCreateExamModal = false;
  }

  // ✅ Bỏ tham số fromSetKey
  createExamForMonth(toSetKey: string) {
    this.examService.createExamForMonth(toSetKey).subscribe({
      next: (res: any) => {
        this.showMessage(
          res?.message || 'Tạo bài thi thành công!',
          'success'
        );
        this.loadExamsGroupedByMonth(); // Reload danh sách
      },
      error: (err) => {
        let msg = 'Có lỗi khi tạo bài thi';
        if (err?.error?.message) msg = err.error.message;
        this.showMessage(msg, 'error');
      }
    });
  }

  // --- Logic Filter được cập nhật ---
  filterExams() {
    // Bắt đầu với danh sách đầy đủ
    let filteredData = [...this.allExamGroups];

    // 1. Lọc theo tháng/năm (selectedSetKey)
    if (this.selectedSetKey) {
      filteredData = filteredData.filter(group => group.examSetKey === this.selectedSetKey);
    }

    // 2. Lọc theo tên bài thi (searchName)
    if (this.searchName) {
      const searchTerm = this.searchName.toLowerCase();
      // Lọc các group có chứa ít nhất một exam khớp với tên tìm kiếm
      filteredData = filteredData.filter(group => 
        group.exams.some((exam: any) => 
          exam.name.toLowerCase().includes(searchTerm)
        )
      );
    }

    // Cập nhật lại danh sách để hiển thị trên giao diện
    this.examGroups = filteredData;
  }

  showMessage(msg: string, type: 'success' | 'error' = 'success') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }
}