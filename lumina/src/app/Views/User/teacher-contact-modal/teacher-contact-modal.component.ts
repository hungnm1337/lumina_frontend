import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TeacherInfo {
    name: string;
    email: string;
    phone: string;
    title?: string;
}

@Component({
    selector: 'app-teacher-contact-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './teacher-contact-modal.component.html',
    styleUrls: ['./teacher-contact-modal.component.scss'],
})
export class TeacherContactModalComponent {
    @Input() isVisible: boolean = false;
    @Output() close = new EventEmitter<void>();

    // Teacher information - can be customized or fetched from a service
    teachers: TeacherInfo[] = [
        {
            name: 'Trần Văn Nam',
            email: 'namtranlumina@gmail.com',
            phone: '0333076326'
            
        }
       
    ];

    onClose(): void {
        this.close.emit();
    }

    onBackdropClick(event: MouseEvent): void {
        // Only close if clicking directly on the backdrop, not on the modal content
        if (event.target === event.currentTarget) {
            this.onClose();
        }
    }

    copyToClipboard(text: string, type: string): void {
        navigator.clipboard.writeText(text).then(() => {
            // You can add a toast notification here if needed
            console.log(`${type} copied to clipboard: ${text}`);
        });
    }

    // Helper method to remove spaces from phone number for tel: link
    getPhoneLink(phone: string): string {
        return 'tel:' + phone.replace(/\s/g, '');
    }
}
