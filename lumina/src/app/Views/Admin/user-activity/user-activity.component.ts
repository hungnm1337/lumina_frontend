import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-user-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-activity.component.html',
  styleUrl: './user-activity.component.scss'
})
export class UserActivityComponent implements AfterViewInit {

  private trafficChart?: Chart;

  constructor() {
    // Register Chart.js components
    Chart.register(...registerables);
  }

  ngAfterViewInit(): void {
    // Khởi tạo biểu đồ sau khi view đã render
    this.createTrafficChart();
  }

  // Biểu đồ Lưu lượng truy cập
  createTrafficChart(): void {
    const ctx = document.getElementById('trafficChart') as HTMLCanvasElement;
    if (ctx) {
      this.trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'],
          datasets: [
            {
              label: 'Lượt truy cập',
              data: [5234, 6789, 7456, 6234, 8123, 7890, 5432],
              borderColor: 'rgb(99, 102, 241)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: 'rgb(99, 102, 241)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            },
            {
              label: 'Người dùng duy nhất',
              data: [3456, 4123, 4890, 4012, 5234, 5012, 3678],
              borderColor: 'rgb(6, 182, 212)',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: 'rgb(6, 182, 212)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  const value = context.parsed.y ?? 0;
                  return context.dataset.label + ': ' + value.toLocaleString() + ' người dùng';
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 12
                }
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                callback: function(value) {
                  return value.toLocaleString();
                },
                font: {
                  size: 12
                }
              }
            }
          }
        }
      });
    }
  }
}
