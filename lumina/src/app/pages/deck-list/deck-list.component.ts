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

  constructor(private flashcardService: FlashcardService) { }

  ngOnInit(): void {
    this.decks = this.flashcardService.getDecks();
  }
}