import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { PromptDTO } from '../../../Interfaces/exam.interfaces';
import { PictureCaptioningService } from '../../../Services/PictureCaptioning/picture-captioning.service';
@Component({
  selector: 'app-prompt',
  standalone: true,
  imports: [],
  templateUrl: './prompt.component.html',
  styleUrl: './prompt.component.scss'
})
export class PromptComponent implements OnChanges {
  isLoading: boolean = false;
  isShowCaption: boolean = false;
  @Output() pictureCaptionChange = new EventEmitter<string>();
  @Input() resetAt: number = 0;
  generateCaption() {
    this.isShowCaption = true;
  }
  @Input() prompt: PromptDTO | null = null;
  pictureCaption: string = '';

  constructor(private pictureCaptioningService: PictureCaptioningService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    if (this.prompt?.referenceImageUrl) {
      this.isLoading = true;
      this.pictureCaptioningService.GetCaptionOfPicture(this.prompt.referenceImageUrl).subscribe({
        next: (response) => {
          this.pictureCaption = response.caption;
          this.pictureCaptionChange.emit(this.pictureCaption);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching picture caption:', error);
          this.isLoading = false;
        }
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetAt'] || changes['prompt']) {
      this.pictureCaption = '';
      this.pictureCaptionChange.emit('');
      // Reset caption visibility when switching question
      this.isShowCaption = false;
      if (this.prompt?.referenceImageUrl) {
        this.isShowCaption = true;
        this.isLoading = true;
        this.pictureCaptioningService.GetCaptionOfPicture(this.prompt.referenceImageUrl).subscribe({
          next: (response) => {
            this.pictureCaption = response.caption;
            this.pictureCaptionChange.emit(this.pictureCaption);
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error fetching picture caption:', error);
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      } else {
        this.isShowCaption = false;
      }
      // Ensure template reflects new prompt immediately
      this.cdr.detectChanges();
    }
  }

}
