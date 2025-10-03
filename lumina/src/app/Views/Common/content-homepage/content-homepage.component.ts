import { Component } from '@angular/core';
import { FooterComponent } from "../footer/footer.component";
import { UserEventsDashboardComponent } from '../../User/event-dashboard/dashboardevent.component';
import { Router } from '@angular/router';
import { UserSlideDashboardComponent } from '../../User/slide-dashboard/dashboardslide.component';
@Component({
  selector: 'app-content-homepage',
  standalone: true,
  imports: [FooterComponent, UserEventsDashboardComponent, UserSlideDashboardComponent],
  templateUrl: './content-homepage.component.html',
  styleUrl: './content-homepage.component.scss'
})
export class ContentHomepageComponent {

  constructor(private router: Router) {}
  scrollToEvent(): void {
    this.router.navigate(['/homepage/events']);
  }
}
