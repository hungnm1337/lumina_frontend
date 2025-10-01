import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { DashboardComponent } from './Dashboard/dashboard/dashboard.component';
import { UserListComponent } from './User/user-list/user-list.component';
import { UserDetailComponent } from './User/user-detail/user-detail.component'; // import user detail component
import { SystemPlansComponent } from './system-plans/system-plans.component';

const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: { title: 'Dashboard Tổng quan' }
      },
      {
        path: 'users-list',
        component: UserListComponent,
        data: { title: 'Danh sách người dùng' }
      },
      {
        path: 'user-detail/:id',
        component: UserDetailComponent,
        data: { title: 'Chi tiết người dùng' }
      },
      {
        path: 'system-plans',
        component: SystemPlansComponent,
        data: { title: 'Quản lý gói và hạn mức' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
