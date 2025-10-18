import { Injectable } from '@angular/core';

// Định nghĩa cấu trúc cho một thuật ngữ (Term)
export interface Term {
  id: number;
  question: string;
  answer: string;
  options?: string[]; 
  // Dành cho câu hỏi trắc nghiệm
}

// Định nghĩa cấu trúc cho một Học phần (Deck)
export interface Deck {
  id: string;
  title: string;
  termCount: number;
  author: string;
  terms: Term[];
}

@Injectable({
  providedIn: 'root'
})
export class FlashcardService {

  // Dữ liệu mẫu
  private decks: Deck[] = [
    {
      id: 'kanji-jpd123',
      title: 'Kanji-JPD123',
      author: 'quizlette75144039',
      termCount: 78,
      terms: [
        { id: 1, question: '水', answer: 'Nước' },
        { id: 2, question: '火', answer: 'Lửa' },
        // ... thêm 76 thuật ngữ khác
      ]
    },
    {
      id: 'mas291-full',
      title: 'MAS291 Full',
      author: 'GCMaui',
      termCount: 243,
      terms: [
        { 
          id: 1, 
          question: 'Problem scoping is a fundamental part of the design process.', 
          answer: 'A',
          options: ['A. True', 'B. False']
        },
        { 
          id: 2, 
          question: 'True or false: One of your goals in designing products with a good user experience should be to fail as early and often as possible.', 
          answer: 'A',
          options: ['a. True', 'b. False']
        },
        {
          id: 3,
          question: 'True or false: In this course, you will "get your hands dirty" and gain hands-on experience with UX Research and Design methods.',
          answer: 'A',
          options: ['a. True', 'b. False']
        }
        // ... thêm 240 thuật ngữ khác
      ]
    },
    {
      id: 'jpd123-grammar',
      title: 'Ngữ pháp JPD123',
      author: 'invandahunter',
      termCount: 17,
      terms: [
        { id: 1, question: '「〜うちに」の意味は何ですか？', answer: 'Trong lúc, trong khi' },
        // ... thêm 16 thuật ngữ khác
      ]
    }
  ];

  constructor() { }

  // Lấy tất cả các học phần (để hiển thị ở trang danh sách)
  getDecks(): Deck[] {
    return this.decks;
  }

  // Lấy một học phần cụ thể bằng ID (để hiển thị ở trang chi tiết)
  getDeckById(id: string): Deck | undefined {
    return this.decks.find(deck => deck.id === id);
  }
}