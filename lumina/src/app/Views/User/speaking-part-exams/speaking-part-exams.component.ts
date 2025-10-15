import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from '../../../Services/Exam/exam.service';
import { ExamDTO } from '../../../Interfaces/exam.interfaces';

@Component({
  selector: 'app-speaking-part-exams',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './speaking-part-exams.component.html',
  styleUrl: './speaking-part-exams.component.scss'
})
export class SpeakingPartExamsComponent implements OnInit {
  partCode: string = '';
  partTitle: string = '';
  exams: ExamDTO[] = [];
  isLoading = true;

  partInfo: { [key: string]: { title: string; subtitle: string; gradient: string } } = {
    'SPEAKING_PART_1': {
      title: 'SPEAKING Q1-2: Read a text aloud',
      subtitle: '10 Practice Tests',
      gradient: 'from-pink-400 to-orange-400'
    },
    'SPEAKING_PART_2': {
      title: 'SPEAKING Q3-4: Describe a picture',
      subtitle: '10 Practice Tests',
      gradient: 'from-purple-400 to-pink-400'
    },
    'SPEAKING_PART_3': {
      title: 'SPEAKING Q5-7: Answer questions',
      subtitle: '10 Practice Tests',
      gradient: 'from-orange-400 to-yellow-400'
    },
    'SPEAKING_PART_4': {
      title: 'SPEAKING Q8-10: Answer questions using information',
      subtitle: '10 Practice Tests',
      gradient: 'from-blue-400 to-cyan-400'
    },
    'SPEAKING_PART_5': {
      title: 'SPEAKING Q11: Express an opinion',
      subtitle: '10 Practice Tests',
      gradient: 'from-pink-400 to-purple-400'
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examService: ExamService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.partCode = params['partCode'];
      this.loadPartInfo();
      this.loadExams();
    });
  }

  private loadPartInfo(): void {
    const info = this.partInfo[this.partCode];
    if (info) {
      this.partTitle = info.title;
    } else {
      this.partTitle = 'Speaking Practice';
    }
  }

  private loadExams(): void {
    this.isLoading = true;
    this.examService.getExamsByTypeAndPart('Speaking', this.partCode).subscribe({
      next: (data) => {
        this.exams = data;
        this.isLoading = false;
        console.log('Exams loaded for part:', this.partCode, data);
      },
      error: (error) => {
        console.error('Error loading exams:', error);
        this.isLoading = false;
      }
    });
  }

  getPartGradient(): string {
    const info = this.partInfo[this.partCode];
    return info ? info.gradient : 'from-gray-400 to-gray-600';
  }

  getPartSubtitle(): string {
    const info = this.partInfo[this.partCode];
    return info ? info.subtitle : 'Practice Tests';
  }

  startExam(exam: ExamDTO): void {
    console.log('Starting exam:', exam);
    // Navigate to the first part of the exam
    this.router.navigate(['homepage/user-dashboard/exam', exam.examId]);
  }

  goBack(): void {
    this.router.navigate(['homepage/user-dashboard/exams']);
  }
}
