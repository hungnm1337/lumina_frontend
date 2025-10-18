import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManagerLayoutComponent } from './layout/manager-layout/manager-layout.component'; 
import { DashboardComponent } from './Dashboard/dashboard/dashboard.component';
import { ManageEventsDashboardComponent } from './Event/dashboardevent.component';
import { DashboardSlideComponent } from './Slide/dashboardslide.component';
import { ArticlesComponent } from './Articles/articles.component';



const routes: Routes = [
  {
    // The main layout for all manager-related pages
    path: '',
    component: ManagerLayoutComponent,
    children: [
      // Default route to dashboard
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, data: { title: 'Bảng điều khiển' } },
      { path: 'events', component: ManageEventsDashboardComponent, data: { title: 'Sự kiện' } },
      { path: 'slides', component: DashboardSlideComponent, data: { title: 'Slide' } },
      { path: 'manage-posts', component: ArticlesComponent, data: { title: 'Quản lý bài viết' } },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManagerRoutingModule { }