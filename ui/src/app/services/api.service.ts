import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, concatMap, from, map, Observable, of, switchMap, tap, toArray} from 'rxjs';
import {Congregation} from '../domains/Congregation';
import {TerritoryMap} from '../domains/MapDesign';

export interface ApiFileResponse {
  message: string;
  file: string;
}

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

  private apiUrl(params: Record<string, string> = {}): string {
    const rootUrl = this.congregation.rootURL.replace(/\/+$/, '');
    const query = new URLSearchParams(params).toString();
    const url = `${rootUrl}/${encodeURIComponent(this.congregation.apiUUID)}.php`;

    return query ? `${url}?${query}` : url;
  }

  private apiHeaders(): Record<string, string> {
    return {
      'X-API-KEY': this.congregation.apiSECRET
    };
  }

  ping(): Observable<any> {
    return this.http.get(this.apiUrl({action: 'ping'}), {
      headers: this.apiHeaders(),
      responseType: 'text'
    });
  }

  uploadJson<T>(name: string, data: T): Observable<ApiFileResponse> {
    return this.http.put<ApiFileResponse>(
      this.apiUrl({name}),
      data,
      {headers: this.apiHeaders()}
    );
  }

  uploadTerritoryMap(map: TerritoryMap): Observable<ApiFileResponse> {
    return this.uploadJson(map.territoryNumber, map);
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
            const uploadUrl = this.apiUrl({action: 'upload-ui', name: remoteName});

            const fileRequest =
              file === 'browser/index.html'
                ? this.http.get(localUrl, {responseType: 'text'}).pipe(
                  map((html: string): Blob => {
                    html = html
                      .replace(
                        '<base href="/">',
                        `<base href="${this.congregation.rootURL}">`
                      )
                      .replace(
                        '<title>FinalApproach</title>',
                        `<title>${this.congregation.name}</title>`
                      );

                    return new Blob([html], {type: 'text/html'});
                  })
                )
                : file === 'browser/manifest.webmanifest'
                  ? this.http.get(localUrl, {responseType: 'text'}).pipe(
                    map((content: string): Blob => {
                      const manifest = JSON.parse(content);

                      manifest.name = this.congregation.name;
                      manifest.short_name = this.congregation.name;
                      manifest.start_url = this.congregation.rootURL;

                      return new Blob(
                        [JSON.stringify(manifest, null, 2)],
                        {type: 'application/manifest+json'}
                      );
                    })
                  )
                  : this.http.get(localUrl, {responseType: 'blob'});

            return fileRequest.pipe(
              switchMap(blob => this.http.post(uploadUrl, blob, {
                headers: this.apiHeaders(),
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
