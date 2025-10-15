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
  isSpeaking?: boolean;
}

interface SpeakingPart {
  partCode: string;
  title: string;
  subtitle: string;
  taskType: string;
  description: string;
  preparationTime: string;
  speakingTime: string;
  gradient: string;
  icon: string;
}

@Component({
  selector: 'app-exams',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exams.component.html',
  styleUrl: './exams.component.scss'
})
export class ExamsComponent {
  exams: ExamDTO[] = [];
  skillGroups: SkillGroup[] = [];
  isLoading = true;
  speakingParts: SpeakingPart[] = [];

  constructor(
    private examService: ExamService,
    private router: Router
  ) {
    this.initializeSpeakingParts();
    this.loadExams();
  }

  private loadExams(): void {
    this.examService.GetAllExams().subscribe({
      next: (data) => {
        this.exams = data;
        this.categorizeExamsBySkill();
        this.isLoading = false;
        console.log('Exams loaded:', this.exams);
      },
      error: (error) => {
        console.error('Error loading exams:', error);
        this.isLoading = false;
      }
    });
  }

  private initializeSpeakingParts(): void {
    this.speakingParts = [
      {
        partCode: 'SPEAKING_PART_1',
        title: 'Câu hỏi 1-2',
        subtitle: 'TOEIC® SPEAKING',
        taskType: 'Đọc thành tiếng một đoạn văn',
        description: 'Thí sinh đọc một đoạn văn trên màn hình. Có 45 giây để chuẩn bị và 45 giây để đọc.',
        preparationTime: '45s',
        speakingTime: '45s',
        gradient: 'from-pink-400 to-orange-400',
        icon: 'fas fa-book-open'
      },
      {
        partCode: 'SPEAKING_PART_2',
        title: 'Câu hỏi 3-4',
        subtitle: 'TOEIC® SPEAKING',
        taskType: 'Miêu tả một bức tranh',
        description: 'Thí sinh mô tả chi tiết một bức tranh. Có 45 giây để chuẩn bị và 30 giây để mô tả.',
        preparationTime: '45s',
        speakingTime: '30s',
        gradient: 'from-purple-400 to-pink-400',
        icon: 'fas fa-image'
      },
      {
        partCode: 'SPEAKING_PART_3',
        title: 'Câu hỏi 5-7',
        subtitle: 'TOEIC® SPEAKING',
        taskType: 'Trả lời câu hỏi',
        description: 'Thí sinh trả lời 3 câu hỏi. Có 3 giây để chuẩn bị sau mỗi câu hỏi. Có 15 giây để trả lời câu 5 và 6, 30 giây cho câu 7.',
        preparationTime: '3s',
        speakingTime: '15s/30s',
        gradient: 'from-orange-400 to-yellow-400',
        icon: 'fas fa-question-circle'
      },
      {
        partCode: 'SPEAKING_PART_4',
        title: 'Câu hỏi 8-10',
        subtitle: 'TOEIC® SPEAKING',
        taskType: 'Trả lời câu hỏi sử dụng thông tin',
        description: 'Thí sinh trả lời 3 câu hỏi dựa trên thông tin được cung cấp. Có 45 giây để đọc thông tin, 3 giây để chuẩn bị, và 15 giây để trả lời câu 8 và 9.',
        preparationTime: '45s',
        speakingTime: '15s',
        gradient: 'from-blue-400 to-cyan-400',
        icon: 'fas fa-info-circle'
      },
      {
        partCode: 'SPEAKING_PART_5',
        title: 'Câu hỏi 11',
        subtitle: 'TOEIC® SPEAKING',
        taskType: 'Trình bày quan điểm',
        description: 'Thí sinh trình bày quan điểm về một chủ đề cụ thể. Có 45 giây để chuẩn bị và 60 giây để nói.',
        preparationTime: '45s',
        speakingTime: '60s',
        gradient: 'from-pink-400 to-purple-400',
        icon: 'fas fa-comments'
      }
    ];
  }

  private categorizeExamsBySkill(): void {
    // Define the 4 TOEIC skills with multiple possible examType values
    const skills = [
      {
        skillName: 'Listening',
        skillCodes: ['LISTENING', 'TOEIC_LISTENING', 'TOEIC_LISTENING_TEST'],
        icon: 'fas fa-headphones',
        color: 'blue',
        isSpeaking: false
      },
      {
        skillName: 'Reading',
        skillCodes: ['READING', 'TOEIC_READING', 'TOEIC_READING_TEST'],
        icon: 'fas fa-book-open',
        color: 'green',
        isSpeaking: false
      },
      {
        skillName: 'Speaking',
        skillCodes: ['SPEAKING', 'TOEIC_SPEAKING', 'TOEIC_SPEAKING_TEST'],
        icon: 'fas fa-microphone',
        color: 'purple',
        isSpeaking: true
      },
      {
        skillName: 'Writing',
        skillCodes: ['WRITING', 'TOEIC_WRITING', 'TOEIC_WRITING_TEST'],
        icon: 'fas fa-pen',
        color: 'orange',
        isSpeaking: false
      }
    ];

    this.skillGroups = skills.map(skill => ({
      skillName: skill.skillName,
      skillCode: skill.skillCodes[0], // Keep first code for display
      icon: skill.icon,
      color: skill.color,
      isSpeaking: skill.isSpeaking,
      exams: this.exams.filter(exam =>
        skill.skillCodes.some(code =>
          exam.examType?.toUpperCase().includes(code.toUpperCase())
        )
      )
    }));

    // Add "Other" category for unmatched exams
    const matchedExamIds = new Set();
    this.skillGroups.forEach(group => {
      group.exams.forEach(exam => matchedExamIds.add(exam.examId));
    });

    const unmatchedExams = this.exams.filter(exam => !matchedExamIds.has(exam.examId));

    if (unmatchedExams.length > 0) {
      this.skillGroups.push({
        skillName: 'Khác',
        skillCode: 'OTHER',
        icon: 'fas fa-question-circle',
        color: 'gray',
        exams: unmatchedExams
      });
    }

    // Debug: Log exam types to console
    console.log('All exam types found:', this.exams.map(exam => exam.examType));
    console.log('Skill groups:', this.skillGroups);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
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

  selectSpeakingPart(partCode: string): void {
    console.log('Selected speaking part:', partCode);
    this.router.navigate(['homepage/user-dashboard/speaking-practice', partCode]);
  }
}
