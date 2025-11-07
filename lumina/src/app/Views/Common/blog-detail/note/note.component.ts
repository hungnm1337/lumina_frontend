import { Component, Input, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserNoteService } from '../../../../Services/UserNote/user-note.service';
import { UserNoteRequestDTO } from '../../../../Interfaces/UserNote/UserNote.interface';
import { AuthService } from '../../../../Services/Auth/auth.service';
import { ToastService } from '../../../../Services/Toast/toast.service';
@Component({
  selector: 'app-note',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './note.component.html',
  styleUrl: './note.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class NoteComponent implements OnInit, OnDestroy {
  @Input() articleId: number = 0;
  @Input() sectionId: number = 0;

  isNoteOpen: boolean = false;
  noteContent: string = '';
  isSaving: boolean = false;
  isLoading: boolean = false;
  saveMessage: string = '';
  private autoSaveInterval: any;
  private lastSavedContent: string = '';
  private currentNoteId: number = 0; // Store the loaded note ID
  private note: UserNoteRequestDTO | null = null;
  constructor(
    private toastService: ToastService,
    private userNoteService: UserNoteService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Load existing note if available
    this.loadExistingNote();
  }

  ngOnDestroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  toggleNote() {
    this.isNoteOpen = !this.isNoteOpen;

    if (this.isNoteOpen && !this.autoSaveInterval) {
      // Start auto-save when note is opened
      this.startAutoSave();
    }
  }

  private loadExistingNote() {
    const userId = this.authService.getCurrentUserId();
    if (!userId || !this.articleId) {
      console.log('Cannot load note: userId or articleId is missing');
      return;
    }

    this.isLoading = true;
    this.userNoteService.GetUserNoteByUserIDAndArticleId(
      userId,
      this.articleId
    ).subscribe({
      next: (note: UserNoteRequestDTO) => {
        this.noteContent = note.noteContent;
      },
      error: (err) => {
        console.error('Error loading note:', err);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  private startAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      if (this.hasUnsavedChanges()) {
        this.saveNote();
      }
    }, 30000); // Auto-save every 30 seconds
  }

  private hasUnsavedChanges(): boolean {
    return this.noteContent.trim() !== '' && this.noteContent !== this.lastSavedContent;
  }

  onNoteContentChange() {
    // Clear save message when user types
    if (this.saveMessage === 'Saved successfully') {
      this.saveMessage = '';
    }
  }

  async saveNote() {
    if (!this.noteContent.trim() || this.isSaving) {
      console.log('Cannot save: empty content or already saving');
      return;
    }

    this.isSaving = true;
    this.saveMessage = 'Saving...';

    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      this.saveMessage = 'Please login to save notes';
      this.isSaving = false;
      setTimeout(() => {
        this.saveMessage = '';
      }, 3000);
      return;
    }

    const noteData: UserNoteRequestDTO = {
      noteId: this.currentNoteId, // Use existing note ID or 0 for new
      articleId: this.articleId,
      userId: userId,
      sectionId: this.sectionId || 1,
      noteContent: this.noteContent
    };

    console.log('Saving note:', noteData);

    try {
      const result = await this.userNoteService.UpSertUserNote(noteData).toPromise();
      if (result) {
        this.lastSavedContent = this.noteContent;
        this.saveMessage = 'Saved successfully';

        this.toastService.success('Note saved successfully');
        // If it was a new note, reload to get the noteId
        if (this.currentNoteId === 0) {
          this.loadExistingNote();
        }

        setTimeout(() => {
          this.saveMessage = '';
        }, 3000);
      } else {
        this.saveMessage = 'Save failed';
        console.error('Save returned false');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      this.saveMessage = 'Error saving note';
      setTimeout(() => {
        this.saveMessage = '';
      }, 3000);
    } finally {
      this.isSaving = false;
    }
  }

}
