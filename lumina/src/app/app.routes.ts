import { Routes } from '@angular/router';
import { ErrorComponent } from './Views/Common/error/error.component';
import { HomepageComponent } from './Views/Common/homepage/homepage.component';
import { DashboardComponent } from './Views/Admin/Dashboard/dashboard/dashboard.component';
import { MenuComponent } from './Views/Manage/Menu/menu/menu.component';
import { ContentHomepageComponent } from './Views/Common/content-homepage/content-homepage.component';

export const routes: Routes = [
  {path: 'homepage', component: HomepageComponent,
    children: [
      {path: '', component: ContentHomepageComponent},
      {path: 'user-dashboard', component: DashboardComponent}
    ]
  },




  {path: '', redirectTo: '/homepage', pathMatch: 'full'},
  {path: '**', component: ErrorComponent},
];
