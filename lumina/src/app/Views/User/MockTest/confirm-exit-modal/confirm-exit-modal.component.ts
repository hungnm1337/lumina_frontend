import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-confirm-exit-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './confirm-exit-modal.component.html',
    styleUrl: './confirm-exit-modal.component.scss',
})
export class ConfirmExitModalComponent {
    @Input() isVisible = false;
    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    onConfirm(): void {
        this.confirm.emit();
    }

    onCancel(): void {
        this.cancel.emit();
    }
}
