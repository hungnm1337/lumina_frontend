import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserNoteService } from '../../../../Services/UserNote/user-note.service';
import { UserNoteResponseDTO, UserNoteRequestDTO } from '../../../../Interfaces/UserNote/UserNote.interface';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../Services/Toast/toast.service';
@Component({
  selector: 'app-user-note-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-note-detail.component.html',
  styleUrl: './user-note-detail.component.scss'
})
export class UserNoteDetailComponent implements OnInit, OnDestroy {
  note: UserNoteResponseDTO | null = null;
  isLoading: boolean = true;
  error: string | null = null;
  private autoSaveInterval: any;
  hasUnsavedChanges: boolean = false;
  private lastSavedContent: string = '';
  isSaving: boolean = false;
  saveMessage: string = '';

  constructor(
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private userNoteService: UserNoteService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const noteId = +params['id'];
      if (noteId) {
        this.loadNoteDetail(noteId);
      }
    });
  }

  private loadNoteDetail(noteId: number): void {
    this.isLoading = true;
    this.error = null;

    this.userNoteService.getUserNoteById(noteId).subscribe({
      next: (note: UserNoteResponseDTO) => {
        this.note = note;
        this.lastSavedContent = note.noteContent;
        this.isLoading = false;
        this.startAutoSave();
      },
      error: (err) => {
        this.error = 'Failed to load note details';
        this.isLoading = false;
        console.error('Error loading note:', err);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  onNoteContentChange(): void {
    if (this.note) {
      this.hasUnsavedChanges = this.lastSavedContent !== this.note.noteContent;
    }
  }

  private startAutoSave(): void {
    // Start auto-save interval
    this.autoSaveInterval = setInterval(() => {
      if (this.hasUnsavedChanges) {
        this.saveNote();
      }
    }, 30000); // 30 seconds
  }

  async saveNote(): Promise<void> {
    if (!this.note || !this.hasUnsavedChanges || this.isSaving) return;

    this.isSaving = true;
    this.saveMessage = 'Saving...';

    const noteData: UserNoteRequestDTO = {
      noteId : this.note.noteId,
      noteContent: this.note.noteContent,
      articleId: this.note.articleId,
      userId: this.note.userId,
      sectionId: this.note.sectionId
    };

    try {
      const result = await this.userNoteService.UpSertUserNote(noteData).toPromise();
      if (result) {
        this.lastSavedContent = this.note.noteContent;
        this.hasUnsavedChanges = false;
        this.saveMessage = 'Saved successfully';
        setTimeout(() => {
          this.saveMessage = '';
        }, 3000);
        this.toastService.success('Note saved successfully');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      this.saveMessage = 'Error saving note';
    } finally {
      this.isSaving = false;
    }
  }

  goBack(): void {
    if (this.hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Do you want to save them before leaving?')) {
        this.saveNote().then(() => {
          this.router.navigate(['homepage/user-dashboard/notes']);
        });
      } else {
        this.router.navigate(['homepage/user-dashboard/notes']);
      }
    } else {
      this.router.navigate(['homepage/user-dashboard/notes']);
    }
  }
}
