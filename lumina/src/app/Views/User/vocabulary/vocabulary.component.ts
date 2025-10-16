import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../Common/header/header.component';

@Component({
  selector: 'app-user-vocabulary',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './vocabulary.component.html',
  styleUrls: ['./vocabulary.component.scss']
})
export class UserVocabularyComponent implements OnInit {

  // Dữ liệu mẫu cho danh sách chủ đề
  categoryList = [
    {
      id: 'business',
      name: 'Kinh doanh',
      iconClass: 'fas fa-briefcase text-blue-600',
      bgColor: 'bg-blue-100',
      wordCount: 245,
      progress: 68,
    },
    {
      id: 'technology',
      name: 'Công nghệ',
      iconClass: 'fas fa-laptop text-green-600',
      bgColor: 'bg-green-100',
      wordCount: 189,
      progress: 45,
    }
  ];

  constructor() { }

  ngOnInit() {
    // Component vocabulary cho User
  }

  // Các hàm xử lý sự kiện click
  startFlashcards(): void {
    console.log('Bắt đầu học Flashcards...');
    // Tại đây bạn sẽ xử lý logic điều hướng đến trang Flashcards
  }

  startQuiz(): void {
    console.log('Bắt đầu làm Quiz...');
    // Tại đây bạn sẽ xử lý logic điều hướng đến trang Quiz
  }

  browseWords(): void {
    console.log('Duyệt danh sách từ vựng...');
    // Tại đây bạn sẽ xử lý logic điều hướng đến trang danh sách từ
  }

  openCategory(categoryId: string): void {
    console.log(`Mở chủ đề: ${categoryId}`);
    // Tại đây bạn sẽ xử lý logic điều hướng đến trang danh sách từ với bộ lọc
  }

  startDailyChallenge(): void {
    console.log('Bắt đầu thử thách hàng ngày...');
  }
}