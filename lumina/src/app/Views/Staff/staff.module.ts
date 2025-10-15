import { NgModule } from '@angular/core';
import { RouterModule,RouterOutlet } from '@angular/router';
import { FormsModule ,ReactiveFormsModule} from '@angular/forms';
import { NgClass,NgIf,CommonModule  } from '@angular/common';


import { StaffRoutingModule } from './staff-routing.module'; 

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterOutlet,
    StaffRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NgClass,
    NgIf
  ]
})
export class StaffModule { }

