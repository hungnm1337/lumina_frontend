import { Component } from '@angular/core';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [],
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.scss']
})
export class ErrorComponent {
 goHome() {
    this.showAlert('Navigating to home page...');
    setTimeout(() => {
      window.location.href = '/'; // or you can inject Router and do router.navigate
    }, 1000);
  }

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.showAlert('No previous page to go back to');
    }
  }

  performSearch(query: string) {
    query = query.trim();
    if (query) {
      this.showAlert(`Searching for: "${query}"`);
      // Navigate or handle search logic here
    } else {
      this.showAlert('Please enter a search term');
    }
  }

  showAlert(message: string) {
    const toast = document.createElement('div');
    toast.className =
      'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 100);

    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
}
