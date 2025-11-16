import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50"
    >
      <div class="max-w-md w-full mx-4">
        <div class="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <!-- Cancel Icon -->
          <div class="mb-6">
            <div
              class="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center"
            >
              <svg
                class="w-12 h-12 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          <!-- Cancel Message -->
          <h1 class="text-3xl font-bold text-gray-900 mb-4">
            Đã Hủy Thanh Toán
          </h1>

          <p class="text-gray-600 mb-6">
            Bạn đã hủy quá trình thanh toán.<br />
            Không có khoản phí nào được tính.
          </p>

          <!-- Info Box -->
          <div
            class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left"
          >
            <p class="text-sm text-gray-700">
              💡 <span class="font-semibold">Gợi ý:</span>
              Nâng cấp lên Premium để truy cập unlimited tất cả các tính năng và
              AI scoring!
            </p>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <button
              (click)="tryAgain()"
              class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 
                     text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              Thử lại thanh toán
            </button>

            <button
              (click)="goToExams()"
              class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl
                     transition-colors duration-200"
            >
              Quay về danh sách bài thi
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PaymentCancelComponent {
  constructor(private router: Router) {}

  tryAgain(): void {
    // Navigate back to upgrade page to retry payment
    this.router.navigate(['/homepage/user-dashboard/upgrade']);
  }

  goToExams(): void {
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }
}
