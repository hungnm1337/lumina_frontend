import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExamService } from '../../../Services/Exam/exam.service';
import { ExamDTO } from '../../../Interfaces/exam.interfaces';

interface SkillGroup {
  skillName: string;
  skillCode: string;
  exams: ExamDTO[];
  icon: string;
  color: string;
}

@Component({
  selector: 'app-exams',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exams.component.html',
  styleUrl: './exams.component.scss',
})
export class ExamsComponent {
  exams: ExamDTO[] = [];
  skillGroups: SkillGroup[] = [];
  isLoading = true;

  constructor(private examService: ExamService, private router: Router) {
    this.loadExams();
  }

  private loadExams(): void {
    this.examService.GetAllExams().subscribe({
      next: (data) => {
        this.exams = data;
        console.log('✅ All exams loaded:', this.exams);
        console.log('✅ Total exams:', this.exams.length);
        console.log(
          '✅ Exam types:',
          this.exams.map((e) => ({
            id: e.examId,
            type: e.examType,
            active: e.isActive,
          }))
        );
        this.categorizeExamsBySkill();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading exams:', error);
        this.isLoading = false;
      },
    });
  }

  private categorizeExamsBySkill(): void {
    // Define the 4 TOEIC skills with multiple possible examType values
    const skills = [
      {
        skillName: 'Listening',
        skillCodes: ['LISTENING', 'TOEIC_LISTENING', 'TOEIC_LISTENING_TEST'],
        icon: 'fas fa-headphones',
        color: 'blue',
      },
      {
        skillName: 'Reading',
        skillCodes: ['READING', 'TOEIC_READING', 'TOEIC_READING_TEST'],
        icon: 'fas fa-book-open',
        color: 'green',
      },
      {
        skillName: 'Speaking',
        skillCodes: ['SPEAKING', 'TOEIC_SPEAKING', 'TOEIC_SPEAKING_TEST'],
        icon: 'fas fa-microphone',
        color: 'purple',
      },
      {
        skillName: 'Writing',
        // ✅ Thêm nhiều biến thể cho Writing
        skillCodes: [
          'WRITTING',
          'WRITING',
          'TOEIC_WRITTING',
          'TOEIC_WRITING',
          'TOEIC_WRITING_TEST',
          'TOEIC_WRITTING_TEST',
        ],
        icon: 'fas fa-pen',
        color: 'orange',
      },
    ];

    this.skillGroups = skills.map((skill) => {
      const filteredExams = this.exams.filter((exam) =>
        skill.skillCodes.some((code) =>
          exam.examType?.toUpperCase().includes(code.toUpperCase())
        )
      );

      console.log(`✅ ${skill.skillName} - Matching codes:`, skill.skillCodes);
      console.log(
        `✅ ${skill.skillName} - Filtered exams:`,
        filteredExams.length,
        filteredExams
      );

      return {
        skillName: skill.skillName,
        skillCode: skill.skillCodes[0],
        icon: skill.icon,
        color: skill.color,
        exams: filteredExams,
      };
    });

    console.log(
      '✅ Skill groups after categorization:',
      this.skillGroups.map((g) => ({
        skill: g.skillName,
        count: g.exams.length,
        examIds: g.exams.map((e) => e.examId),
      }))
    );

    // Add "Other" category for unmatched exams
    const matchedExamIds = new Set();
    this.skillGroups.forEach((group) => {
      group.exams.forEach((exam) => matchedExamIds.add(exam.examId));
    });

    const unmatchedExams = this.exams.filter(
      (exam) => !matchedExamIds.has(exam.examId)
    );

    if (unmatchedExams.length > 0) {
      this.skillGroups.push({
        skillName: 'Other',
        skillCode: 'OTHER',
        icon: 'fas fa-question-circle',
        color: 'gray',
        exams: unmatchedExams,
      });
    }

    // Debug: Log exam types to console
    console.log(
      'All exam types found:',
      this.exams.map((exam) => exam.examType)
    );
    console.log('Skill groups:', this.skillGroups);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  getSkillGradient(color: string): string {
    switch (color) {
      case 'blue':
        return 'from-blue-500 to-blue-700';
      case 'green':
        return 'from-green-500 to-green-700';
      case 'purple':
        return 'from-purple-500 to-purple-700';
      case 'orange':
        return 'from-orange-500 to-orange-700';
      case 'gray':
        return 'from-gray-500 to-gray-700';
      default:
        return 'from-gray-500 to-gray-700';
    }
  }

  getButtonColor(color: string): string {
    switch (color) {
      case 'blue':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'green':
        return 'bg-green-500 hover:bg-green-600';
      case 'purple':
        return 'bg-purple-500 hover:bg-purple-600';
      case 'orange':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'gray':
        return 'bg-gray-500 hover:bg-gray-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  }

  startExam(exam: ExamDTO): void {
    console.log('Selected exam ID:', exam.examId);
    console.log('Selected exam:', exam);

    // Navigate to exam detail page
    this.router.navigate(['homepage/user-dashboard/exam', exam.examId]);
  }
}
