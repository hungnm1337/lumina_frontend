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
      this.filteredNotes = this.userNotes.filter(note =>
        note.noteContent.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        note.user.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        note.section.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        note.article.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  MoveToDetail(noteId: number) {
    // Navigate to the note detail page
    this.router.navigate(['homepage/user-dashboard/note', noteId]);
  }
}
