import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private http = inject(HttpClient);
  private baseUrl = '';
  private apiSECRET = '';

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setApiSECRET(apiSECRET: string) {
    this.apiSECRET = apiSECRET;
  }

  ping(): Observable<any> {
    return this.http.get(this.baseUrl, {
      headers: {
        'X-API-KEY': this.apiSECRET
      },
      responseType: 'text'
    });
  }

}
