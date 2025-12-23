import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RealtimeNotification {
  notificationId: number;
  title: string;
  content: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection?: signalR.HubConnection;
  private connectionEstablished = new BehaviorSubject<boolean>(false);
  private notificationReceived = new Subject<RealtimeNotification>();

  public connectionEstablished$ = this.connectionEstablished.asObservable();
  public notificationReceived$ = this.notificationReceived.asObservable();

  constructor() { }

  public startConnection(): void {
    const token = localStorage.getItem('lumina_token');

    if (!token) {
      // console.warn('No token found, cannot connect to SignalR');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl.replace('/api', '')}/notificationHub`, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.None) // Suppress all logs
      .build();

    this.hubConnection.serverTimeoutInMilliseconds = 30000; // 30 seconds
    this.hubConnection.keepAliveIntervalInMilliseconds = 10000; // 10 seconds

    this.hubConnection
      .start()
      .then(() => {
        // console.log('SignalR Connected');
        // console.log('Connection ID:', this.hubConnection?.connectionId);
        // console.log('Transport:', (this.hubConnection as any)?.connection?.transport?.name);
        this.connectionEstablished.next(true);
        this.registerListeners();
      })
      .catch(err => {
        // Silently fail - suppress error logs
        this.connectionEstablished.next(false);

        // Retry after 5 seconds
        setTimeout(() => {
          this.startConnection();
        }, 5000);
      });

    // Handle reconnection
    this.hubConnection.onreconnecting((error) => {
      // Silently handle reconnection
      this.connectionEstablished.next(false);
    });

    this.hubConnection.onreconnected((connectionId) => {
      // Silently handle reconnection
      this.connectionEstablished.next(true);
      this.registerListeners();
    });

    this.hubConnection.onclose((error) => {
      // Silently handle close
      this.connectionEstablished.next(false);

      // Auto-reconnect
      setTimeout(() => {
        this.startConnection();
      }, 5000);
    });
  }

  private registerListeners(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('ReceiveNotification', (notification: RealtimeNotification) => {
      // console.log('New notification received:', notification);
      this.notificationReceived.next(notification);
    });
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => {
          // console.log('SignalR connection stopped');
          this.connectionEstablished.next(false);
        })
        .catch(err => { });
    }
  }

  public isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }
}
