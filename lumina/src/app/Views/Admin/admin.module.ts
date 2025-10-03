import { NgModule, LOCALE_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass, NgIf, CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { DashboardComponent } from './Dashboard/dashboard/dashboard.component';

import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';

registerLocaleData(localeVi, 'vi');

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    RouterModule,
    AdminRoutingModule,
    FormsModule,
    DashboardComponent,
    NgClass,
    NgIf
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'vi' }   // set mặc định cho toàn module
  ]
})
export class AdminModule { }
