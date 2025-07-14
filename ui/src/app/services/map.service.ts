import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapService {

  constructor() { 
    console.log('API Base URL:', environment.apiBaseUrl);
    console.log('Production Mode:', environment.production);
  }

  saveHome(map: any): Observable<void> {
    return new Observable<void>(observer => {
      if (map) {
        // read coordinates and zoom level from a configuration or set them directly
        const homeCoordinates = map.getView().getCenter();
        const homeZoom = map.getView().getZoom();
        console.log('Home coordinates:', homeCoordinates, 'Zoom level:', homeZoom);
        // save the home view settings to a service or local storage
        localStorage.setItem('homeCoordinates', JSON.stringify(homeCoordinates));
        localStorage.setItem('homeZoom', homeZoom.toString());
      }
      observer.next();
      observer.complete();
    });
  }

  loadHome(): Observable<{ coordinates: number[], zoom: number } | null> {
    const homeCoordinates = localStorage.getItem('homeCoordinates');
    const homeZoom = localStorage.getItem('homeZoom');

    if (homeCoordinates && homeZoom) {
      return new Observable(observer => {
        observer.next({
          coordinates: JSON.parse(homeCoordinates),
          zoom: parseFloat(homeZoom)
        });
        observer.complete();
      });
    } else {
      return new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
    }
  }
}
