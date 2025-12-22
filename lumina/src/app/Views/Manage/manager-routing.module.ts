import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManagerLayoutComponent } from './layout/manager-layout/manager-layout.component';
import { DashboardComponent } from './Dashboard/dashboard/dashboard.component';
import { ManageEventsDashboardComponent } from './Event/dashboardevent.component';
import { DashboardSlideComponent } from './Slide/dashboardslide.component';
import { ArticlesComponent } from './Articles/articles.component';
import { ArticleDetailComponent } from './Articles/article-detail/article-detail.component';
import { VocabularyManagementComponent } from './Vocabulary/vocabulary-management.component';
import { ReportingOverviewComponent } from './Reporting/reporting-overview.component';
import { ReportListComponent } from '../Common/report-list/report-list.component';



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
      { path: 'manage-posts/:id', component: ArticleDetailComponent, data: { title: 'Chi tiết bài viết' } },
      { path: 'vocabulary', component: VocabularyManagementComponent, data: { title: 'Quản lý từ vựng' } },
      { path: 'user-reports', component: ReportListComponent, data: { title: 'Báo cáo người dùng' } },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./Notifications/notifications.component').then(
            (m) => m.ManagerNotificationsComponent
          ),
        data: { title: 'Thông báo' }
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../User/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
        data: { title: 'Hồ sơ' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManagerRoutingModule { }
