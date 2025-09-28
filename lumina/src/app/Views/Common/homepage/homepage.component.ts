import { Component } from '@angular/core';
import { ToastService } from '../../../Services/Toast/toast.service';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from "../header/header.component";
@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.scss'
})
export class HomepageComponent {
moveToUserDashboard() {
  this.router.navigate(['/homepage/user-dashboard']);
}
  constructor(private toastService: ToastService, private router: Router) {}

  moveToTest() {
    this.toastService.success('Navigating to test...');
  }

}
