import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface AccordionItem {
  id: string;
  title: string;
  expanded: boolean;
  content?: string;
}

/**
 * AptisPrepareComponent: Tái hiện trang chuẩn bị bài thi Aptis General theo chuẩn British Council.
 * Cho phép xem cấu trúc bài thi, mở rộng accordion từng kỹ năng và nhấn "Take a practice test".
 */
@Component({
  selector: 'app-aptis-prepare',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aptis-prepare.component.html',
  styleUrls: ['./aptis-prepare.component.scss']
})
export class AptisPrepareComponent {
  private router = inject(Router);

  goBack(): void {
    this.router.navigate(['/homepage']);
  }

  accordions: AccordionItem[] = [
    {
      id: 'grammar',
      title: 'Grammar and Vocabulary test',
      expanded: false,
      content: 'The Grammar and Vocabulary component is the core component of the Aptis test. It consists of two parts: 25 grammar questions and 25 vocabulary questions. Total time: 25 minutes.'
    },
    {
      id: 'listening',
      title: 'Listening test',
      expanded: false,
      content: 'The Listening test consists of 4 parts with 25 audio recordings, testing comprehension of everyday spoken English. Total time: approx. 40 minutes.'
    },
    {
      id: 'reading',
      title: 'Reading test',
      expanded: false,
      content: 'The Reading test tests your ability to understand written English in different formats, ranging from simple sentence matching to cohesive text and long reading passages. Total time: 35 minutes.'
    },
    {
      id: 'speaking',
      title: 'Speaking test',
      expanded: true // Mặc định mở phần Speaking như yêu cầu
    }
  ];

  toggleAccordion(id: string): void {
    const item = this.accordions.find(a => a.id === id);
    if (item) {
      item.expanded = !item.expanded;
    }
  }

  takePracticeTest(): void {
    this.router.navigate(['/aptis/speaking-test']);
  }
}
