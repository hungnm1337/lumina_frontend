import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
  selector: 'app-speaking-practice',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './speaking-practice.component.html',
  styleUrl: './speaking-practice.component.scss'
})
export class SpeakingPracticeComponent {
  speakingParts: SpeakingPart[] = [
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

  constructor(private router: Router) {}

  selectPart(partCode: string): void {
    console.log('Selected part:', partCode);
    this.router.navigate(['homepage/user-dashboard/speaking-practice', partCode]);
  }
}
