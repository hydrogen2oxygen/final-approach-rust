import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {transformExtent} from 'ol/proj';
import {OsmBlockService} from './osm-block.service';

describe('OsmBlockService', () => {
  let service: OsmBlockService;
  let http: HttpTestingController;
  const endpoint = 'https://overpass-api.de/api/interpreter';
  const extent = transformExtent([9.2, 48.6, 9.21, 48.61], 'EPSG:4326', 'EPSG:3857');

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    service = TestBed.inject(OsmBlockService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests JSON street geometry and buildings as form data', () => {
    service.loadBlocks(extent).subscribe(result => expect(result).toEqual([]));
    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.get('data')).toContain('[out:json]');
    expect(request.request.body.get('data')).toContain('way["building"]');
    expect(request.request.body.get('data')).toContain('out geom;');
    request.flush({elements: []});
  });

  it('rejects oversized areas before sending a request', () => {
    expect(() => service.loadBlocks(transformExtent([9, 48, 10, 49], 'EPSG:4326', 'EPSG:3857')))
      .toThrowError(/smaller rectangle/);
    http.expectNone(endpoint);
  });

  it('cancels the HTTP request when unsubscribed', () => {
    const subscription = service.loadBlocks(extent).subscribe();
    const request = http.expectOne(endpoint);
    subscription.unsubscribe();
    expect(request.cancelled).toBeTrue();
  });

  it('surfaces Overpass timeout remarks instead of returning partial blocks', () => {
    const error = jasmine.createSpy('error');
    service.loadBlocks(extent).subscribe({next: () => fail('Partial results must not be imported'), error});
    http.expectOne(endpoint).flush({elements: [], remark: 'runtime error: timeout'});
    expect(error).toHaveBeenCalled();
  });
});
