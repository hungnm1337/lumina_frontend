import { Routes } from '@angular/router';
import { ErrorComponent } from './Views/Common/error/error.component';
import { HomepageComponent } from './Views/Common/homepage/homepage.component';
import { UserDashboardComponent } from './Views/User/Dashboard/dashboard/dashboard.component';
import { MenuComponent } from './Views/Manage/Menu/menu/menu.component';
import { ContentHomepageComponent } from './Views/Common/content-homepage/content-homepage.component';
import { ExamsComponent } from './Views/User/exams/exams.component';
import { ExamPartComponent } from './Views/User/exam-part/exam-part.component';
import { PartQuestionComponent } from './Views/User/part-question/part-question.component';
import { DashboardComponent } from './Views/Admin/Dashboard/dashboard/dashboard.component';
// import { ContentHomepageComponent } from './Views/Common/content-homepage/content-homepage.component';
import { LoginComponent } from './Views/Auth/login/login.component'; // <-- THÊM
import { RegisterComponent } from './Views/Auth/register/register.component'; // <-- THÊM
import { ForgotPasswordComponent } from './Views/Auth/forgot-password/forgot-password.component'; // <-- THÊM
import { AuthGuard } from './Services/Auth/auth.guard'; 
import { RoleGuard } from './Services/Auth/role.guard';
export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () =>
      import('./Views/Admin/admin.module').then((m) => m.AdminModule),
    canActivate: [RoleGuard],
    data: { roles: [1] }
  },
  {
    path: 'staff',
    loadChildren: () =>
      import('./Views/Staff/staff.module').then((m) => m.StaffModule),
    canActivate: [RoleGuard],
    data: { roles: [3] }
  },
  {
    path: 'homepage',
    component: HomepageComponent,
    children: [
      { path: '', component: ContentHomepageComponent },
      {
        path: 'user-dashboard',
        component: UserDashboardComponent,
        children: [
          { path: 'exams', component: ExamsComponent },
          { path: 'exam/:id', component: ExamPartComponent },
          { path: 'part/:id', component: PartQuestionComponent },
          { path: '', redirectTo: 'exams', pathMatch: 'full' },
          // {path: 'vocabulary', component: VocabularyComponent},
          // {path: 'notes', component: NotesComponent},
          // {path: 'study', component: StudyComponent},
          // {path: 'notifications', component: NotificationsComponent}
        ],
      },
    ],
  },
  
  { 
    path: 'profile', 
    loadComponent: () => import('./Views/User/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [AuthGuard] // Bảo vệ route profile
  },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },

  { path: '', redirectTo: '/homepage', pathMatch: 'full' },
  { path: '**', component: ErrorComponent },
];
