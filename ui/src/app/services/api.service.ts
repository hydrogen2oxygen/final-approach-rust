import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, concatMap, from, map, Observable, of, switchMap, tap, toArray} from 'rxjs';
import {Congregation} from '../domains/Congregation';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private http = inject(HttpClient);
  private congregation: Congregation = undefined;

  private uploadProgressSubject = new BehaviorSubject<number>(0);
  readonly uploadProgress$ = this.uploadProgressSubject.asObservable();

  setCongregation(congregation: Congregation) {
    this.congregation = congregation;
  }

  ping(): Observable<any> {
    return this.http.get(`${this.congregation.rootURL}/${this.congregation.apiUUID}.php?action=ping`, {
      headers: {
        'X-API-KEY': this.congregation.apiSECRET
      },
      responseType: 'text'
    });
  }

  uploadUI(): Observable<void> {
    this.uploadProgressSubject.next(0);
    console.log('Uploading UI ... START...');

    return this.http.get<string[]>('/files.json').pipe(
      map(files => files.filter(file => file.startsWith('browser/'))),
      switchMap(files => {
        console.log('Uploading files:', files);
        if (files.length === 0) {
          this.uploadProgressSubject.next(100);
          return of(void 0);
        }

        let completed = 0;

        return from(files).pipe(
          concatMap(file => {
            const localUrl = '/' + file;
            const remoteName = file.substring('browser/'.length);
            const separator = this.congregation.rootURL.includes('?') ? '&' : '?';
            const uploadUrl =
              `${this.congregation.rootURL}/${this.congregation.apiUUID}.php${separator}action=upload-ui&name=${encodeURIComponent(remoteName)}`;

            const fileRequest = file === 'browser/index.html'
              ? this.http.get(localUrl, {responseType: 'text'}).pipe(
                map((html: string): Blob => {

                  html = html.replace(
                    '<base href="/">',
                    `<base href="${this.congregation.rootURL}">`
                  ).replace('<title>FinalApproach</title>',`<title>${this.congregation.name}</title>`);

                  return new Blob([html], {type: 'text/html'});
                })
              )
              : this.http.get(localUrl, {responseType: 'blob'});

            return fileRequest.pipe(
              switchMap(blob => this.http.post(uploadUrl, blob, {
                headers: {
                  'X-API-KEY': this.congregation.apiSECRET
                },
                responseType: 'text'
              })),
              tap(() => {
                completed++;
                this.uploadProgressSubject.next(
                  Math.round(completed / files.length * 100)
                );
              })
            );
          }),
          toArray(),
          map((): void => {})
        );
      })
    );
  }
}
