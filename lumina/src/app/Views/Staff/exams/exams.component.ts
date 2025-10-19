import { Component, OnInit, NgModule } from '@angular/core';
import { ExamService } from '../../../Services/Exam/exam.service';
import { NgClass, SlicePipe, CommonModule } from '@angular/common';


@Component({
  selector: 'app-exams',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exams.component.html',
  styleUrls: ['./exams.component.scss']
})
export class ExamsComponent implements OnInit {
  examGroups: any[] = [];
  visibleExamGroups: any[] = [];
  showMonths = 3;
  showAll = false;


constructor(private examService: ExamService) { }


ngOnInit(): void {
  this.examService.getAllExamsWithParts().subscribe({
    next: (data) => {
      // Đảm bảo data sẵn sàng, đã sort theo tháng giảm dần nếu cần
      this.examGroups = data;
    },
    error: (err) => {
      console.error('Lỗi khi tải bài thi:', err);
    }
  });
}

// onLoadMore() {
//   this.showMonths += 3;
// }


  loadExamsGroupedByMonth() {
    this.examService.getAllExamsWithParts().subscribe({
      next: (data) => {
        // Giả sử data đã được sắp xếp giảm dần theo tháng
        this.examGroups = data;
        this.updateVisibleGroups();
      },
      error: (err) => {
        console.error('Lỗi khi tải bài thi:', err);
      }
    });
  }

  updateVisibleGroups() {
    this.visibleExamGroups = this.examGroups.slice(0, this.showMonths);
  }

  onLoadMore() {
    this.showMonths += 3;  // Mỗi lần click tăng thêm 3 tháng
    this.updateVisibleGroups();
  }

  openExamModal(exam?: any) {
    // Mở modal chi tiết bài thi
    console.log('Mở modal bài thi:', exam);
  }
toggleExamStatus(exam: any) {
  this.examService.toggleExamStatus(exam.examId).subscribe({
    next: () => {
      exam.isActive = !exam.isActive;
    },
    error: (err) => {
      console.error('Lỗi khi thay đổi trạng thái bài thi:', err);
    }
  });
}

}

