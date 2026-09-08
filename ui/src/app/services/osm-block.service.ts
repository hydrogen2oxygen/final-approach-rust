import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {map, Observable, timeout} from 'rxjs';
import {Extent, getHeight, getWidth} from 'ol/extent';
import Polygon, {fromExtent} from 'ol/geom/Polygon';
import {transformExtent} from 'ol/proj';
import {getArea} from 'ol/sphere';
import {BLOCK_ROADS, buildOsmBlocks, OsmBlockResponse} from './osm-blocks';

@Injectable({providedIn: 'root'})
export class OsmBlockService {

  private readonly http = inject(HttpClient);

  loadBlocks(extent: Extent): Observable<Polygon[]> {
    const bounds = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
    if (!bounds.every(Number.isFinite) || bounds[0] < -180 || bounds[2] > 180
      || bounds[1] < -85 || bounds[3] > 85 || getWidth(extent) <= 0 || getHeight(extent) <= 0
      || getArea(fromExtent(extent)) > 4_000_000
      || getWidth(bounds) > 0.1 || getHeight(bounds) > 0.1) {
      throw new Error('Please select a smaller rectangle (maximum 4 km²).');
    }
    // A small margin retains connections just outside the selection. Output is not clipped.
    const margin = 0.002;
    const bbox = [Math.max(-85, bounds[1] - margin), Math.max(-180, bounds[0] - margin),
      Math.min(85, bounds[3] + margin), Math.min(180, bounds[2] + margin)].join(',');
    const query = `[out:json][timeout:45];(way["highway"~"^(${BLOCK_ROADS})$"](${bbox});`
      + `way["building"]["building"!="no"](${bbox}););out geom;`;

    return this.http.post<OsmBlockResponse>('https://overpass-api.de/api/interpreter',
      new HttpParams().set('data', query)).pipe(
      timeout(60_000),
      map(response => buildOsmBlocks(response, extent))
    );
  }
}
