import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { LeaderboardService, LeaderboardDTO, CreateLeaderboardDTO, UpdateLeaderboardDTO, PaginatedResultDTO } from '../../../../Services/Leaderboard/leaderboard.service';

@Component({
  selector: 'app-seasons',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './seasons.component.html',
  styleUrls: ['./seasons.component.scss']
})
export class SeasonsComponent implements OnInit {
  isLoading = false;
  error: string | null = null;

  keyword = '';
  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;

  items: LeaderboardDTO[] = [];
  allSeasons: LeaderboardDTO[] = [];
  current?: LeaderboardDTO | null;

  form!: FormGroup;
  isEdit = false;
  editingId: number | null = null;

  constructor(private fb: FormBuilder, private service: LeaderboardService) {}

  ngOnInit() {
    this.form = this.fb.group({
      seasonName: [''],
      seasonNumber: [null, [Validators.required, Validators.min(1)]],
      startDate: [''],
      endDate: [''],
      isActive: [false]
    }, { validators: [this.dateOrderValidator.bind(this), this.overlapValidator.bind(this)] });

    this.form.valueChanges.subscribe(() => {
      // trigger validators continuously for UX
      this.form.updateValueAndValidity({ onlySelf: false, emitEvent: false });
    });

    this.loadData();
    this.loadCurrent();
    this.loadAllSeasons();
  }

  private dateOrderValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('startDate')?.value as string | null;
    const end = group.get('endDate')?.value as string | null;
    if (start && end && new Date(end) < new Date(start)) {
      return { dateOrder: 'Ngày kết thúc phải sau ngày bắt đầu' };
    }
    return null;
  }

  private overlapValidator(group: AbstractControl): ValidationErrors | null {
    if (!this.allSeasons || this.allSeasons.length === 0) return null;
    const startStr = group.get('startDate')?.value as string | null;
    const endStr = group.get('endDate')?.value as string | null;
    const seasonNumber = group.get('seasonNumber')?.value as number | null;

    // season number uniqueness is already validated backend; add gentle client check
    if (seasonNumber && this.allSeasons.some(s => s.seasonNumber === seasonNumber && s.leaderboardId !== this.editingId)) {
      return { seasonNumberExists: 'Số mùa đã tồn tại' };
    }

    const start = startStr ? new Date(startStr) : null;
    const end = endStr ? new Date(endStr) : null;

    // If both empty, no overlap check necessary
    const overlaps = this.allSeasons.some(s => {
      if (this.editingId && s.leaderboardId === this.editingId) return false;
      const sStart = s.startDate ? new Date(s.startDate) : null;
      const sEnd = s.endDate ? new Date(s.endDate) : null;
      // Treat null as open range
      const cond1 = !sStart || !end || sStart <= end;
      const cond2 = !start || !sEnd || start <= sEnd;
      return cond1 && cond2;
    });

    return overlaps ? { dateOverlap: 'Khoảng thời gian trùng với mùa khác' } : null;
  }

  loadAllSeasons() {
    this.service.getAll().subscribe({
      next: (res) => this.allSeasons = res || [],
      error: () => this.allSeasons = []
    });
  }

  loadData() {
    this.isLoading = true;
    this.service.getAllPaginated(this.keyword, this.page, this.pageSize).subscribe({
      next: (res: PaginatedResultDTO<LeaderboardDTO>) => {
        this.items = res.items;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Không thể tải dữ liệu';
        this.isLoading = false;
      }
    });
  }

  loadCurrent() {
    this.service.getCurrent().subscribe({
      next: (res) => this.current = res,
      error: () => this.current = null
    });
  }

  resetForm() {
    this.isEdit = false;
    this.editingId = null;
    this.form.reset({ seasonName: '', seasonNumber: null, startDate: '', endDate: '', isActive: false });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  onCreate() {
    if (this.form.invalid) return;
    const raw = this.form.value as any;
    const body: CreateLeaderboardDTO = {
      seasonName: raw.seasonName?.trim() || null,
      seasonNumber: Number(raw.seasonNumber),
      startDate: raw.startDate ? raw.startDate : null,
      endDate: raw.endDate ? raw.endDate : null,
      isActive: !!raw.isActive
    };
    this.isLoading = true;
    this.service.create(body).subscribe({
      next: () => { this.resetForm(); this.loadData(); this.loadCurrent(); this.loadAllSeasons(); },
      error: (err) => { this.error = err?.error?.message || 'Tạo mùa thất bại'; this.isLoading = false; }
    });
  }

  onEdit(item: LeaderboardDTO) {
    this.isEdit = true;
    this.editingId = item.leaderboardId;
    this.form.patchValue({
      seasonName: item.seasonName || '',
      seasonNumber: item.seasonNumber,
      startDate: item.startDate ? item.startDate.substring(0, 10) : '',
      endDate: item.endDate ? item.endDate.substring(0, 10) : '',
      isActive: item.isActive
    });
    // Update validators context when editing
    this.form.updateValueAndValidity();
  }

  onUpdate() {
    if (this.form.invalid || this.editingId == null) return;
    const raw = this.form.value as any;
    const body: UpdateLeaderboardDTO = {
      seasonName: raw.seasonName?.trim() || null,
      seasonNumber: Number(raw.seasonNumber),
      startDate: raw.startDate ? raw.startDate : null,
      endDate: raw.endDate ? raw.endDate : null,
      isActive: !!raw.isActive
    };
    this.isLoading = true;
    this.service.update(this.editingId, body).subscribe({
      next: () => { this.resetForm(); this.loadData(); this.loadCurrent(); this.loadAllSeasons(); },
      error: (err) => { this.error = err?.error?.message || 'Cập nhật mùa thất bại'; this.isLoading = false; }
    });
  }

  onDelete(id: number) {
    if (!confirm('Xóa mùa này?')) return;
    this.isLoading = true;
    this.service.delete(id).subscribe({
      next: () => { this.loadData(); this.loadCurrent(); this.loadAllSeasons(); },
      error: (err) => { this.error = err?.error?.message || 'Xóa mùa thất bại'; this.isLoading = false; }
    });
  }

  onSetCurrent(id: number) {
    this.isLoading = true;
    this.service.setCurrent(id).subscribe({
      next: () => { this.loadData(); this.loadCurrent(); },
      error: (err) => { this.error = err?.error?.message || 'Thiết lập mùa hiện tại thất bại'; this.isLoading = false; }
    });
  }
}


