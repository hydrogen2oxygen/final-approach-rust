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
import { ToastrService } from 'ngx-toastr';
import { AppService } from './services/app.service';

@Component({
    selector: 'app-root',
    imports: [CommonModule, MatButtonModule, MatDialogModule,  MatIconModule],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  map: Map | undefined;
  osmLayer: TileLayer | undefined;
  home: any;
  appName = 'Final Approach Rust UI';
  version = '1.0.0';

  constructor(
    private dialog: MatDialog,
    private mapService: MapService,
    private appService: AppService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.osmLayer = new TileLayer({
          source: new OSM({
            attributions: [] // entfernt Attribution von OSM
          })
        });
    this.map = new Map({
      target: 'map',
      controls: [],
      layers: [
        this.osmLayer
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
        projection: 'EPSG:3857'
      })
    });
    this.loadHome()
    this.appService.getAppInfo().subscribe(info => {
      this.appName = info.appName;
      this.version = info.version;
      console.log('App Name:', this.appName);
    });

  }


  openDialog(): void {
    this.dialog.open(InfoDialogComponent, {
      width: '800px',
      data: {
        appName: this.appName,
        version: this.version,
        home: this.home
      }
    });
  }

  saveHome(): void {
    this.mapService.saveHome(this.map).subscribe(() => {
      this.mapService.loadHome().subscribe(home => {
        if (home && this.map) {
          this.home = home;
          this.toastr.success('Home view saved successfullyy: ' + JSON.stringify(home));
          console.log('Home view saved successfully!');
        }
      });
    }, error => {
      this.toastr.error('Failed to save home view: ' + error.message);
    });  
  }

  loadHome(): void {
    this.mapService.loadHome().subscribe(home => {
      console.log('Loaded home view:', home);
      this.home = home;
      if (home && this.map) {
        this.map.getView().setCenter(home.coordinates);
        this.map.getView().setZoom(home.zoom);
      }
    });
  }
}
