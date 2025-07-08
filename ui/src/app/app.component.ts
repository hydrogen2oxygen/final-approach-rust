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


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, InfoDialogComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    new Map({
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
  }

  openDialog(): void {
    this.dialog.open(InfoDialogComponent, {
      width: '400px'
    });
  }
}
