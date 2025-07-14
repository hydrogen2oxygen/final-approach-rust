import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppService {
  
  constructor() {
    console.log('AppService initialized');
  }

  getAppInfo(): Observable<any> {
    return new Observable(observer => {
        observer.next({ appName: 'Final Approach Rust', version: '1.0.1' });
        observer.complete();
    });
  }

}
