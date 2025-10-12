import { Component, Input } from '@angular/core';
import { PromptDTO } from '../../../Interfaces/exam.interfaces';
import { PictureCaptioningService } from '../../../Services/PictureCaptioning/picture-captioning.service';
@Component({
  selector: 'app-prompt',
  standalone: true,
  imports: [],
  templateUrl: './prompt.component.html',
  styleUrl: './prompt.component.scss'
})
export class PromptComponent {
  @Input() prompt: PromptDTO | null = null;
  pictureCaption: string = '';

  constructor(private pictureCaptioningService: PictureCaptioningService) { }

  ngOnInit() {
    if (this.prompt?.referenceImageUrl) {
      this.pictureCaptioningService.GetCaptionOfPicture(this.prompt.referenceImageUrl).subscribe({
        next: (response) => {
          this.pictureCaption = response.caption;
        },
        error: (error) => {
          console.error('Error fetching picture caption:', error);
        }
      });
    }
  }

}
