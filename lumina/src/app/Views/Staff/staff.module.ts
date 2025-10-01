import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass,NgIf,CommonModule  } from '@angular/common';
import { RouterOutlet } from '@angular/router'; 


import { StaffRoutingModule } from './staff-routing.module'; 

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterOutlet,
    StaffRoutingModule,
    RouterModule,
    FormsModule,
    NgClass,
    NgIf
  ]
})
export class StaffModule { }

