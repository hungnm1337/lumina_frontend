import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

declare let gtag: Function;

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalyticsService {

  constructor(private router: Router) { }

  // ✅ 1. Track Page Views tự động khi route thay đổi
  // public initializePageTracking(): void {
  //   this.router.events.pipe(
  //     filter(event => event instanceof NavigationEnd)
  //   ).subscribe((event: any) => {
  //     gtag('config', 'G-Q7N0ZLNL1H', {
  //       page_path: event.urlAfterRedirects
  //     });
  //     console.log('📊 GA4 Page View:', event.urlAfterRedirects);
  //   });
  // }
  public initializePageTracking(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {

      gtag('event', 'page_view', {
        page_path: event.urlAfterRedirects,
        page_location: window.location.href,
        page_title: document.title
      });

      // console.log('📊 GA4 Page View:', event.urlAfterRedirects);
    });
  }

  // ✅ 2. Track Custom Events
  public trackEvent(
    eventName: string,
    eventParams?: {
      event_category?: string;
      event_label?: string;
      value?: number;
      [key: string]: any;
    }
  ): void {
    gtag('event', eventName, eventParams);
    console.log('📊 GA4 Event:', eventName, eventParams);
  }

  // ✅ 3. Track User Login
  public trackLogin(method: string): void {
    gtag('event', 'login', {
      method: method
    });
  }

  // ✅ 4. Track User Registration
  public trackSignUp(method: string): void {
    gtag('event', 'sign_up', {
      method: method
    });
  }

  // ✅ 5. Track Purchase (khi user mua gói Pro)
  public trackPurchase(
    transactionId: string,
    value: number,
    currency: string = 'VND',
    items: any[]
  ): void {
    gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: value,
      currency: currency,
      items: items
    });
  }

  // ✅ 6. Track Begin Checkout (khi user bắt đầu thanh toán)
  public trackBeginCheckout(
    value: number,
    currency: string = 'VND',
    items: any[]
  ): void {
    gtag('event', 'begin_checkout', {
      value: value,
      currency: currency,
      items: items
    });
  }

  // ✅ 7. Track View Item (khi user xem gói Pro)
  public trackViewItem(
    itemId: string,
    itemName: string,
    price: number,
    currency: string = 'VND'
  ): void {
    gtag('event', 'view_item', {
      currency: currency,
      value: price,
      items: [{
        item_id: itemId,
        item_name: itemName,
        price: price
      }]
    });
  }

  // ✅ 8. Track User Properties
  public setUserProperties(userId: string, properties: any): void {
    gtag('set', 'user_properties', {
      user_id: userId,
      ...properties
    });
  }

  // ✅ 9. Track Errors
  public trackError(errorMessage: string, fatal: boolean = false): void {
    gtag('event', 'exception', {
      description: errorMessage,
      fatal: fatal
    });
  }

  // ✅ 10. Track Search
  public trackSearch(searchTerm: string): void {
    gtag('event', 'search', {
      search_term: searchTerm
    });
  }

  // ✅ 11. Track Video Play (nếu có video bài giảng)
  public trackVideoPlay(videoTitle: string, videoUrl: string): void {
    gtag('event', 'video_start', {
      video_title: videoTitle,
      video_url: videoUrl
    });
  }

  // ✅ 12. Track Test Start
  public trackTestStart(testType: string, testId: string): void {
    gtag('event', 'test_start', {
      test_type: testType,
      test_id: testId
    });
  }

  // ✅ 13. Track Test Complete
  public trackTestComplete(
    testType: string,
    testId: string,
    score: number,
    timeSpent: number
  ): void {
    gtag('event', 'test_complete', {
      test_type: testType,
      test_id: testId,
      score: score,
      time_spent_seconds: timeSpent
    });
  }
}