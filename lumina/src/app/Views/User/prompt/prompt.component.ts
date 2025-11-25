import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { PromptDTO } from '../../../Interfaces/exam.interfaces';
import { PictureCaptioningService } from '../../../Services/PictureCaptioning/picture-captioning.service';
@Component({
  selector: 'app-prompt',
  standalone: true,
  imports: [],
  templateUrl: './prompt.component.html',
  styleUrls: ['./prompt.component.scss'],
})
export class PromptComponent implements OnChanges {
  isLoading: boolean = false;
  isShowCaption: boolean = false;
  @Output() pictureCaptionChange = new EventEmitter<string>();
  @Input() resetAt: number = 0;
  @Input() questionType: string = ''; // Add questionType input to identify speaking questions
  generateCaption() {
    this.isShowCaption = true;
  }
  @Input() prompt: PromptDTO | null = null;
  pictureCaption: string = '';

  constructor(
    private pictureCaptioningService: PictureCaptioningService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Picture captioning is now handled in ngOnChanges to ensure questionType is set
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prompt']) {
      // Prompt changed event handler
    }

    if (changes['resetAt'] || changes['prompt']) {
      this.pictureCaption = '';
      this.pictureCaptionChange.emit('');
      // Reset caption visibility when switching question
      this.isShowCaption = false;

      // Skip picture captioning for speaking and listening questions
      if (this.isSpeakingQuestion() || this.isListeningQuestion()) {
        this.isShowCaption = false;
        this.cdr.detectChanges();
        return;
      }

      if (this.prompt?.referenceImageUrl) {
        this.isShowCaption = true;
        this.isLoading = true;
        this.pictureCaptioningService
          .GetCaptionOfPicture(this.prompt.referenceImageUrl)
          .subscribe({
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
            },
          });
      } else {
        this.isShowCaption = false;
      }
      // Ensure template reflects new prompt immediately
      this.cdr.detectChanges();
    }
  }

  isSpeakingQuestion(): boolean {
    const speakingTypes = [
      'READ_ALOUD',
      'DESCRIBE_PICTURE',
      'RESPOND_QUESTIONS',
      'RESPOND_WITH_INFO',
      'EXPRESS_OPINION',
    ];
    return speakingTypes.includes(this.questionType);
  }
  isListeningQuestion(): boolean {
    const listeningTypes = [
      'LISTENING_PART_1',
      'LISTENING_PART_2',
      'LISTENING_PART_3',
      'LISTENING_PART_4',
      'LISTENING',
    ];
    return listeningTypes.includes(this.questionType);
  }
}
