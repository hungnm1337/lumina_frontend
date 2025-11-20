import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MockTestService } from '../../../../Services/MockTest/mocktest.service';
import { MockTestResultDTO, PartResultDTO } from '../../../../Interfaces/mocktest.interface';
import { ToastService } from '../../../../Services/Toast/toast.service';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.scss']
})
export class ResultComponent{

}
