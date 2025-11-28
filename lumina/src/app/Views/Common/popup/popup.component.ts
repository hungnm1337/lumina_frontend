import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [],
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

  onOk(): void {
    this.okClicked.emit();
  }

  onCancel(): void {
    this.cancelClicked.emit();
  }
}
