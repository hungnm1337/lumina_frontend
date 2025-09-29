
import { Routes } from '@angular/router';
import { ErrorComponent } from './Views/Common/error/error.component';
import { HomepageComponent } from './Views/Common/homepage/homepage.component';
import { DashboardComponent } from './Views/Admin/Dashboard/dashboard/dashboard.component';
import { ContentHomepageComponent } from './Views/Common/content-homepage/content-homepage.component';
import { LoginComponent } from './Views/Auth/login/login.component'; // <-- THÊM
import { RegisterComponent } from './Views/Auth/register/register.component'; // <-- THÊM
import { ForgotPasswordComponent } from './Views/Auth/forgot-password/forgot-password.component'; // <-- THÊM

export const routes: Routes = [
   {
        path: 'admin',
        loadChildren: () => import('./Views/Admin/admin.module').then(m => m.AdminModule)
    },
  {
    path: 'homepage', component: HomepageComponent,
    children: [
      { path: '', component: ContentHomepageComponent },
      { path: 'user-dashboard', component: DashboardComponent }
    ]
  },

  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },

  { path: '', redirectTo: '/homepage', pathMatch: 'full' },
  { path: '**', component: ErrorComponent },
];
