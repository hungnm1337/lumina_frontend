import { Component } from '@angular/core';
import { AuthService } from '../../../../Services/Auth/auth.service';
import { UserNoteService } from '../../../../Services/UserNote/user-note.service';
import { UserNoteResponseDTO } from '../../../../Interfaces/UserNote/UserNote.interface';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService } from '../../../../Services/Toast/toast.service';
@Component({
  selector: 'app-user-note-list',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './user-note-list.component.html',
  styleUrl: './user-note-list.component.scss'
})
export class UserNoteListComponent {

  userNotes: UserNoteResponseDTO[] = [];
  searchTerm: string = '';
  filteredNotes: UserNoteResponseDTO[] = [];
  sortBy: string = 'newest';

  constructor(
    private router: Router,
    private toastService: ToastService,
    private userNoteService: UserNoteService,
    private authService: AuthService
  ) {
    this.loadUserNotes();
  }
  private loadUserNotes(): void {
    const userId = this.authService.getCurrentUserId();
    if (userId !== null) {
      this.userNoteService
        .getUserNotesByUserId(userId)
        .subscribe((notes: UserNoteResponseDTO[]) => {
          this.userNotes = notes;
          console.log(this.userNotes);
          this.filterNotes();
        });
    }
  }

  filterNotes(): void {
    if (!this.searchTerm) {
      this.filteredNotes = [...this.userNotes];
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredNotes = this.userNotes.filter(note =>
        note.noteContent?.toLowerCase().includes(searchLower) ||
        note.user?.toLowerCase().includes(searchLower) ||
        note.section?.toLowerCase().includes(searchLower) ||
        note.article?.toLowerCase().includes(searchLower)
      );
    }
    this.applySorting();
  }

  applySorting(): void {
    switch (this.sortBy) {
      case 'newest':
        this.filteredNotes.sort((a, b) =>
          new Date(b.createAt).getTime() - new Date(a.createAt).getTime()
        );
        break;
      case 'oldest':
        this.filteredNotes.sort((a, b) =>
          new Date(a.createAt).getTime() - new Date(b.createAt).getTime()
        );
        break;
      case 'updated':
        this.filteredNotes.sort((a, b) =>
          new Date(b.updateAt).getTime() - new Date(a.updateAt).getTime()
        );
        break;
      case 'article':
        this.filteredNotes.sort((a, b) =>
          a.article.localeCompare(b.article)
        );
        break;
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterNotes();
  }

  MoveToDetail(noteId: number) {
    // Navigate to the note detail page
    this.router.navigate(['homepage/user-dashboard/note', noteId]);
  }
}
