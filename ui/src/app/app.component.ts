import { Component, OnInit } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { MatDialog } from '@angular/material/dialog';
import { InfoDialogComponent } from './components/info-dialog/info-dialog.component';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MapService } from './services/map.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule, ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-root',
    imports: [CommonModule, MatButtonModule, MatDialogModule, InfoDialogComponent, MatIconModule, BrowserAnimationsModule, ToastrModule],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  map: Map | undefined;
  constructor(
    private dialog: MatDialog,
    private mapService: MapService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.map = new Map({
      target: 'map',
      controls: [],
      layers: [
        new TileLayer({
          source: new OSM({
            attributions: [] // entfernt Attribution von OSM
          })
        })
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
        projection: 'EPSG:3857'
      })
    });
    this.loadHome()
  }

  openDialog(): void {
    this.dialog.open(InfoDialogComponent, {
      width: '400px'
    });
  }

  saveHome(): void {
    this.mapService.saveHome(this.map).subscribe(() => {
      this.toastr.success('Home view saved successfully!', 'Success');
      console.log('Home view saved successfully!');
    });
  }

  loadHome(): void {
    this.mapService.loadHome().subscribe(home => {
      console.log('Loaded home view:', home);
      if (home && this.map) {
        this.map.getView().setCenter(home.coordinates);
        this.map.getView().setZoom(home.zoom);
      }
    });
  }
}
