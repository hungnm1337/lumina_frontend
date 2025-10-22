import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Deck, FlashcardService } from '../../Services/flashcard/flashcard.service'; 
import { HeaderComponent } from '../../Views/Common/header/header.component'; 

@Component({
  selector: 'app-deck-list',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent], // Thêm RouterModule để dùng routerLink
  templateUrl: './deck-list.component.html',
  styleUrls: ['./deck-list.component.scss']
})
export class DeckListComponent implements OnInit {
  decks: Deck[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(private flashcardService: FlashcardService) { }

  ngOnInit(): void {
    this.loadDecks();
  }

  loadDecks(): void {
    this.isLoading = true;
    this.error = null;
    
    this.flashcardService.getDecks().subscribe({
      next: (decks) => {
        this.decks = decks;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading decks:', error);
        this.error = 'Không thể tải danh sách từ vựng. Vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }
}