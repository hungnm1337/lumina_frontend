import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass,NgIf,CommonModule  } from '@angular/common';
import { RouterOutlet } from '@angular/router'; 


import { ManagerRoutingModule } from './manager-routing.module'; 

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterOutlet,
    ManagerRoutingModule,
    RouterModule,
    FormsModule,
    NgClass,
    NgIf
  ]
})
export class ManagerModule { }

