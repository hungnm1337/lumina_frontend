import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  emailInput: string = '';
  isSubscribed: boolean = false;

  subscribeNewsletter(): void {
    if (this.emailInput && this.emailInput.includes('@')) {
      this.isSubscribed = true;
      this.emailInput = '';
      setTimeout(() => {
        this.isSubscribed = false;
      }, 4000);
    }
  }
}
