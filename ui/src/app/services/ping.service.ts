import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PingService {
  constructor() {}

  ping(): Observable<string> {
    return new Observable(observer => {
      const ws = new WebSocket(environment.wsUrl);

      ws.onopen = () => {
        ws.send('ping');
      };

      ws.onmessage = event => {
        observer.next(event.data);
        observer.complete();
        ws.close();
      };

      ws.onerror = err => {
        observer.error(err);
      };
    });
  }
}
