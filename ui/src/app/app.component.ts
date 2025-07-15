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
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Fill, Stroke, Style, Text} from 'ol/style';
import {FeatureLike} from 'ol/Feature';
import {FormControl} from '@angular/forms';
import {DragAndDrop, Draw, Select} from 'ol/interaction';
import {GeoJSON, GPX, IGC, KML, TopoJSON, WKT} from 'ol/format';
import {Feature} from 'ol';
import {TerritoryMap} from './domains/MapDesign';
import {Geometry} from 'ol/geom';

@Component({
    selector: 'app-root',
    imports: [CommonModule, MatButtonModule, MatDialogModule,  MatIconModule],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  map: Map | undefined;
  view: View = new View();
  osmLayer: TileLayer | undefined;
  vectorLayer:VectorLayer<any>=new VectorLayer<any>();
  source = new VectorSource();
  showOsmData:boolean = false;
  hideImportedFeature:boolean = true;
  home: any;
  note = new FormControl('');
  territoryNumber = new FormControl('');
  territoryCustomNumber = new FormControl('');
  territoryCustomName = new FormControl('');
  selectInteraction = new Select();
  dragAndDropInteraction = new DragAndDrop({
    formatConstructors: [GPX as any, GeoJSON as any, IGC as any, KML as any, TopoJSON as any],
  });
  wktFormat = new WKT();
  featureModified = false;
  modeSelected = '';
  lastSelectedFeature: Feature | undefined = undefined;
  //lastSelectedTerritoryMap: TerritoryMap | undefined = undefined;
  lastSavedTerritoryName: string = '';
  importedFeature: Feature | undefined = undefined;
  interaction: any = null;
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
            attributions: []
          })
        });
    this.vectorLayer = new VectorLayer({
      source: this.source,
      style: this.featureFunction.bind(this)
    });

    this.view = new View({
      center: [0, 0],
      zoom: 2,
      projection: 'EPSG:3857'
    });
    this.map = new Map({
      target: 'map',
      controls: [],
      layers: [
        this.osmLayer,
        this.vectorLayer
      ],
      view: this.view
    });
    this.map.addInteraction(this.selectInteraction);
    this.map.addInteraction(this.dragAndDropInteraction);
    this.selectInteraction.on('select', e => {
      if (e.deselected) {
        console.log("deselect")
        this.lastSelectedFeature = undefined;
        this.territoryCustomNumber.setValue(null);
        this.territoryCustomName.setValue(null);
        this.note.setValue(null);
        //return;
      }

      this.lastSelectedFeature = e.selected[0];
      if (this.lastSelectedFeature) {
        this.territoryCustomNumber.setValue(this.lastSelectedFeature.get('territoryNumber'));
        this.territoryCustomName.setValue(this.lastSelectedFeature.get('territoryName'));
        this.note.setValue(this.lastSelectedFeature.get('note'));
      }

      /*this.mapDesign.territoryMapList.forEach(t => {
        if (t.territoryNumber == this.territoryCustomNumber.value) {
          this.lastSelectedTerritoryMap = t;
        }
      })*/
    });
    this.loadHome()
    this.appService.getAppInfo().subscribe(info => {
      this.appName = info.appName;
      this.version = info.version;
      console.log('App Name:', this.appName);
    });

  }

  public createStyle(fillColor:any = [0, 0, 0, 0.1], strokeColor:any = [255, 0, 0, 0.5], strokeWidth:number = 5, textFillColor:string = '#000', textStrokeColor:string = '#fff', textStrokeWidth:number = 3):Style {
    return new Style({
      fill: new Fill({
        color: fillColor
      }),
      stroke: new Stroke({
        color: strokeColor,
        width: strokeWidth
      }),
      text: new Text({
        text: '',
        font: '12px Calibri,sans-serif',
        overflow: true,
        fill: new Fill({
          color: textFillColor,
        }),
        stroke: new Stroke({
          color: textStrokeColor,
          width: textStrokeWidth,
        }),
      })
    });
  }

  featureFunction(feature:FeatureLike) :Style {

    let style = this.createStyle();

    if (!this.showOsmData && feature.get('residentialUnit')) {
      style = new Style({});
    } if (this.showOsmData && feature.get('residentialUnit')) {
      style = this.createStyle([0, 255, 0, 0.05],[0, 0, 255, 0.05],5,'#00c4ff','#fff',2);
    } else if (feature.get('imported') && !this.hideImportedFeature) {
      style = this.createStyle([0, 0, 0, 0.05],[255, 0, 0, 0.25],4,'#000','#fff',3);
    } else if (feature.get('imported') && this.hideImportedFeature) {
      style = new Style({});
    } else if (feature.get('draft') == false) {
      style = this.createStyle([0, 255, 0, 0.1],[0, 100, 0, 0.5],5,'#007700','#fff',2);
    }

    if (!(feature.get('imported') || feature.get('residentialUnit'))) {
      if (this.map.getView().getZoom() > 14 && feature.get('additionalNote')) {
        style.getText().setText(feature.get('name') + "\n" + feature.get('additionalNote'));
      } else
      if (this.map.getView().getZoom() > 14) {
        style.getText().setText(feature.get('name'));
      } else {
        style.getText().setText('');
      }
    }
    return style;
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

  drawPolygon() {
    this.territoryNumber.setValue('');
    this.addInteraction("Polygon");
    this.modeSelected = 'polygon';
  }

  private addInteraction(type: string) {
    this.removeInteraction();
    this.interaction = new Draw({
      type: type as any,
      source: this.source
    });
    let draw: Draw = this.interaction;
    draw.on('drawend', evt => {
      console.log('draw ended!');
      this.lastSelectedFeature = evt.feature;

      let territoryMap = new TerritoryMap();
      territoryMap.draft = true;
      territoryMap.lastUpdate = new Date();
      let data = this.wktFormat.writeGeometry(<Geometry>this.lastSelectedFeature?.getGeometry());

      if (data == null || data == undefined) {
        data = '';
      }

      territoryMap.simpleFeatureData = data;

      /* FIXME this.mapDesignService.saveTerritoryMap(territoryMap).subscribe((t: TerritoryMap) => {

        console.log(t)
        //this.lastSelectedFeature = undefined;

        if (this.lastSelectedFeature) {
          this.lastSelectedFeature.set('territoryNumber', t.territoryNumber);
          this.lastSelectedFeature.set('territoryName', t.territoryName);
          this.lastSelectedFeature.set('name', '' + t.territoryNumber);
          this.lastSelectedFeature.set('note', t.note);
          this.lastSelectedFeature.set('draft', t.draft);
          this.lastSelectedFeature.setId(territoryMap.territoryNumber);
          //this.source.addFeature(feature);
          console.log(this.lastSelectedFeature)
          this.mapDesign.territoryMapList.push(t);
        }
      });*/

    });

    this.map?.addInteraction(this.interaction);
    this.modeSelected = 'navigate';
  }

  private removeInteraction() {
    this.map?.removeInteraction(this.interaction);
    this.interaction = null;
  }
}
