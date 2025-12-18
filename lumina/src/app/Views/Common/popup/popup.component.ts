import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './popup.component.html',
  styleUrls: ['./popup.component.scss'],
})
export class PopupComponent {
  @Input() message: string = '';
  @Input() title: string = '';
  @Input() showCancelButton: boolean = true;
  @Input() textAlign: 'left' | 'center' | 'right' = 'center';
  @Output() okClicked = new EventEmitter<void>();
  @Output() cancelClicked = new EventEmitter<void>();

  isClosing = false;

  onOk(): void {
    this.closeWithAnimation(() => this.okClicked.emit());
  }

  onCancel(): void {
    this.closeWithAnimation(() => this.cancelClicked.emit());
  }

  private closeWithAnimation(callback: () => void): void {
    this.isClosing = true;
    // Wait for animation to complete before emitting
    setTimeout(() => {
      callback();
      this.isClosing = false;
    }, 150); // Match animation duration
  }
}
