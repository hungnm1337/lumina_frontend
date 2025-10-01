import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StatisticService } from '../../../Services/Statistic/statistic.service';
import { PackagesService } from '../../../Services/Packages/packages.service';
import { NgClass, NgIf, CommonModule } from '@angular/common';

@Component({
  selector: 'app-system-plans',
  standalone: true,
  imports: [FormsModule, NgClass, NgIf, CommonModule],
  templateUrl: './system-plans.component.html',
  styleUrls: ['./system-plans.component.scss']
})
export class SystemPlansComponent implements OnInit {
  basePrice: any = 200000;

  planStats: any = null;
  packageList: any[] = [];

  newPlan = {
    name: '',
    price: 0,
    day: 1
  };

  editingPlan: any = null;

  message = ''; // thông báo lỗi hoặc thành công
  messageType: 'success' | 'error' = 'success';

  constructor(
    private statisticService: StatisticService,
    private packagesService: PackagesService
  ) { }

  ngOnInit(): void {
    this.loadDashboardStats();
    this.loadPackages();
  }

  calculatePrice(months: number): string {
    let discount = 0;
    if (months === 6) discount = 0.15;
    else if (months === 12) discount = 0.3;
    const price = this.basePrice * months * (1 - discount);
    return price.toLocaleString('vi-VN') + ' VND';
  }

  openCreatePlanModal() {
    this.editingPlan = null;
    this.resetNewPlan();
    const modal = document.getElementById('planModal');
    if (modal) modal.classList.remove('hidden');
  }

  openEditPlanModal(pkg: any) {
    this.editingPlan = pkg;
    this.newPlan = {
      name: pkg.packageName,
      price: pkg.price,
      day: pkg.durationInDays
    };
    const modal = document.getElementById('planModal');
    if (modal) modal.classList.remove('hidden');
  }

  closePlanModal() {
    const modal = document.getElementById('planModal');
    if (modal) modal.classList.add('hidden');
    this.resetNewPlan();
    this.editingPlan = null;
  }

  resetNewPlan() {
    this.newPlan = { name: '', price: 0, day: 1 };
  }

  createOrUpdatePlan() {
    if (!this.newPlan.name || this.newPlan.price <= 0 || this.newPlan.day < 1) {
      this.showMessage('Vui lòng nhập đủ và hợp lệ thông tin gói', 'error');
      return;
    }
    if (this.editingPlan && this.editingPlan.packageId) {
      const updated = {
        packageId: this.editingPlan.packageId,
        packageName: this.newPlan.name,
        price: this.newPlan.price,
        durationInDays: this.newPlan.day,
        isActive: this.editingPlan.isActive ?? true
      };
      console.log('Update package', updated);
      this.packagesService.updatePackage(updated.packageId, updated).subscribe({
        next: () => {
          this.showMessage('Cập nhật gói thành công', 'success');
          this.loadPackages();
          this.closePlanModal();
        },
        error: err => {
          console.error('Error updating package', err);
          this.showMessage('Lỗi khi cập nhật gói', 'error');
        }
      });
    } else {
      const newPkg = {
        packageName: this.newPlan.name,
        price: this.newPlan.price,
        durationInDays: this.newPlan.day,
        isActive: true
      };
      console.log('Create new package', newPkg);
      this.packagesService.addPackage(newPkg).subscribe({
        next: () => {
          this.showMessage('Tạo gói mới thành công', 'success');
          this.loadPackages();
          this.closePlanModal();
        },
        error: err => {
          console.error('Error creating package', err);
          this.showMessage('Lỗi khi tạo gói', 'error');
        }
      });
    }
  }


  togglePackageStatus(pkg: any) {
    const confirmMsg = pkg.isActive ? 'Bạn có chắc muốn khóa gói này?' : 'Bạn có chắc muốn mở khóa gói này?';
    if (!confirm(confirmMsg)) {
      return;
    }
    this.packagesService.togglePackageStatus(pkg.packageId).subscribe({
      next: () => {
        pkg.isActive = !pkg.isActive;
        this.showMessage(pkg.isActive ? 'Mở khóa thành công' : 'Khóa thành công', 'success');
      },
      error: err => {
        console.error(err);
        this.showMessage('Lỗi khi thay đổi trạng thái', 'error');
      }
    });
  }

  showMessage(msg: string, type: 'success' | 'error') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }


  loadDashboardStats() {
    this.statisticService.getFullDashboardStats().subscribe(
      data => {
        this.planStats = data;
        const p1m = this.planStats.packageStats.find((p: any) => p.packageName.includes('1 Tháng'));
        if (p1m) this.basePrice = p1m.price ;
      },
      err => console.error(err)
    );
  }

  loadPackages() {
    this.packagesService.getActiveProPackages().subscribe(
      data => this.packageList = data,
      err => console.error(err)
    );
  }




}
