import { Component } from '@angular/core';
import { FooterComponent } from "../footer/footer.component";

@Component({
  selector: 'app-content-homepage',
  standalone: true,
  imports: [FooterComponent],
  templateUrl: './content-homepage.component.html',
  styleUrl: './content-homepage.component.scss'
})
export class ContentHomepageComponent {

}
