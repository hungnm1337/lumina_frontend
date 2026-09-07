import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../Services/Auth/auth.service';
import { ToastService } from '../../../Services/Toast/toast.service';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface EventItem {
  tag: string;
  tagType: 'sale' | 'event' | 'workshop';
  status: string;
  statusType: 'active' | 'upcoming' | 'hot';
  title: string;
  description: string;
  date: string;
  duration: string;
  image: string;
}

interface Testimonial {
  quote: string;
  name: string;
  achievement: string;
}

interface SkillProgress {
  name: string;
  percentage: number;
}

import { SkillListComponent } from '../skill-list/skill-list.component';

@Component({
  selector: 'app-content-homepage',
  standalone: true,
  imports: [CommonModule, RouterModule, SkillListComponent],
  templateUrl: './content-homepage.component.html',
  styleUrl: './content-homepage.component.scss',
})
export class ContentHomepageComponent implements OnInit {

  /* ── Hero skills ── */
  heroSkills = [
    { key: 'listening', title: 'Listening', icon: 'assets/Icon/Icon_Listening.png' },
    { key: 'reading', title: 'Reading', icon: 'assets/Icon/Icon_Reading.png' },
    { key: 'writing', title: 'Writing', icon: 'assets/Icon/Icon_Writing.png' },
    { key: 'speaking', title: 'Speaking', icon: 'assets/Icon/Icon_Speaking.png' },
  ];

  /* ── Features strip ── */
  features: (Feature & { color: string })[] = [
    {
      icon: 'fa-bullseye',
      color: '#e11d48',
      title: 'Lộ trình cá nhân hóa',
      description: 'AI phân tích & thiết kế lộ trình phù hợp với bạn',
    },
    {
      icon: 'fa-file-lines',
      color: '#eab308',
      title: 'Kho đề chuẩn ETS',
      description: 'Cập nhật liên tục các đề thi mới nhất',
    },
    {
      icon: 'fa-lightbulb',
      color: '#f59e0b',
      title: 'Giải thích chi tiết',
      description: 'Phân tích đáp án kỹ càng, dễ hiểu',
    },
    {
      icon: 'fa-chart-line',
      color: '#2563eb',
      title: 'Theo dõi tiến độ',
      description: 'Biểu đồ trực quan giúp bạn nhìn thấy sự tiến bộ',
    },
  ];

  /* ── Welcome stats ── */
  stats = [
    { icon: 'fa-users', value: '15.000+', label: 'Học viên' },
    { icon: 'fa-user-check', value: '98%', label: 'Hài lòng' },
    { icon: 'fa-calendar-check', value: '2000+', label: 'Đề thi' },
  ];

  /* ── Circular progress ── */
  overallProgress = 76;
  readonly circleRadius = 54;
  readonly circleCircumference = 2 * Math.PI * 54; // ≈ 339.292

  skillProgress: SkillProgress[] = [
    { name: 'Listening', percentage: 85 },
    { name: 'Reading', percentage: 70 },
    { name: 'Writing', percentage: 65 },
    { name: 'Speaking', percentage: 80 },
  ];

  get progressOffset(): number {
    return this.circleCircumference * (1 - this.overallProgress / 100);
  }

  /* ── Events ── */
  events: EventItem[] = [
    {
      tag: 'ƯU ĐÃI',
      tagType: 'sale',
      status: 'Đang diễn ra',
      statusType: 'active',
      title: 'Black Friday 2026 - Giảm giá sốc',
      description:
        'Giảm đến 60% cho tất cả các khóa học TOEIC. Chỉ diễn ra trong 3 ngày duy nhất!',
      date: '02/08/2026',
      duration: '3 ngày',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80',
    },
    {
      tag: 'SỰ KIỆN',
      tagType: 'event',
      status: 'Đang diễn ra',
      statusType: 'active',
      title: 'Tuần lễ luyện thi TOEIC miễn phí',
      description:
        '7 ngày trải nghiệm miễn phí toàn bộ tính năng premium. Học thử không giới hạn!',
      date: '05/08/2026',
      duration: '7 ngày',
      image: 'assets/student-laptop.png',
    },
    {
      tag: 'WORKSHOP',
      tagType: 'workshop',
      status: 'Sắp diễn ra',
      statusType: 'upcoming',
      title: 'Workshop: Chiến lược làm bài TOEIC',
      description:
        'Buổi workshop trực tuyến với giảng viên chuyên gia. Chia sẻ bí quyết đạt điểm cao 900+ TOEIC.',
      date: '10/08/2026',
      duration: '2 giờ',
      image: 'assets/student-studying.png',
    },
  ];

  /* ── Testimonials ── */
  testimonials: Testimonial[] = [
    {
      quote:
        'Lumina không chỉ giúp mình nâng cao điểm số mà còn xây dựng sự tự tin trong giao tiếp tiếng Anh. Lộ trình học rất khoa học và phù hợp với người bận rộn như mình.',
      name: 'Nguyễn Minh Anh',
      achievement: 'TOEIC 955',
    },
  ];

  currentTestimonialIndex = 0;

  get currentTestimonial(): Testimonial {
    return this.testimonials[this.currentTestimonialIndex];
  }

  /* ── Footer links ── */
  footerProducts = ['Luyện tập', 'Đề thi', 'Từ vựng', 'Lộ trình học'];
  footerSupport = ['Hướng dẫn sử dụng', 'FAQ', 'Liên hệ', 'Chính sách bảo mật'];
  footerAbout = ['Giới thiệu', 'Tin tức', 'Tuyển dụng', 'Điều khoản sử dụng'];

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {}

  /* ── Navigation ── */
  startLearning(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/homepage/user-dashboard']);
  }

  startTest(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.toastService.info('Vui lòng đăng nhập để bắt đầu kiểm tra');
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['homepage/mocktest/exams']);
  }

  viewAllEvents(): void {
    this.router.navigate(['/homepage/events']);
  }

  exploreLearningPath(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/homepage/user-dashboard']);
  }

  prevTestimonial(): void {
    this.currentTestimonialIndex =
      (this.currentTestimonialIndex - 1 + this.testimonials.length) %
      this.testimonials.length;
  }

  nextTestimonial(): void {
    this.currentTestimonialIndex =
      (this.currentTestimonialIndex + 1) % this.testimonials.length;
  }
}
