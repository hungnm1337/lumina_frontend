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

  constructor() {}

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
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10000]) // Faster retry
      .configureLogging(signalR.LogLevel.Error)
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
        // console.error('Error connecting to SignalR:', err);
        this.connectionEstablished.next(false);
        
        // Retry after 5 seconds
        setTimeout(() => {
          // console.log('Retrying SignalR connection...');
          this.startConnection();
        }, 5000);
      });

    // Handle reconnection
    this.hubConnection.onreconnecting((error) => {
      // console.warn('SignalR reconnecting...', error);
      this.connectionEstablished.next(false);
    });

    this.hubConnection.onreconnected((connectionId) => {
      // console.log('SignalR reconnected:', connectionId);
      this.connectionEstablished.next(true);
      this.registerListeners(); // Re-register listeners after reconnection
    });

    this.hubConnection.onclose((error) => {
      // console.error('SignalR connection closed:', error);
      this.connectionEstablished.next(false);
      
      // Auto-reconnect
      setTimeout(() => {
        // console.log('Attempting to reconnect...');
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
        .catch(err => {});
    }
  }

  public isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }
}
