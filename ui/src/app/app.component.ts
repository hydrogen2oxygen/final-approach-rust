import {Component, OnInit} from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {InfoDialogComponent} from './components/info-dialog/info-dialog.component';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MapService} from './services/map.service';
import {ToastrService} from 'ngx-toastr';
import {AppService} from './services/app.service';
import {PingService} from './services/ping.service';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Fill, Stroke, Style, Text} from 'ol/style';
import {FeatureLike} from 'ol/Feature';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DragAndDrop, Draw, Modify, Select} from 'ol/interaction';
import {GeoJSON, GPX, IGC, KML, TopoJSON, WKT} from 'ol/format';
import {Feature} from 'ol';
import {TerritoryMap,Personas} from './domains/MapDesign';
import {Geometry} from 'ol/geom';
import {DocumentationComponent} from './components/documentation/documentation.component';
import {PersonaComponent} from './components/persona/persona.component';
import {Coordinate} from 'ol/coordinate';
import {toLonLat} from 'ol/proj';

@Component({
    selector: 'app-root',
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, ReactiveFormsModule],
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
  territoryName = new FormControl('');
  territoryAdditionalNote = new FormControl('');
  territoryCustomNumber = new FormControl('');
  territoryCustomName = new FormControl('');
  selectInteraction = new Select();
  dragAndDropInteraction = new DragAndDrop({
    formatConstructors: [GPX as any, GeoJSON as any, IGC as any, KML as any, TopoJSON as any],
  });
  wktFormat = new WKT();
  featureModified = false;
  modeSelected = '';
  lastSelectedFeature: Feature | undefined;
  //lastSelectedTerritoryMap: TerritoryMap | undefined = undefined;
  lastSavedTerritoryName: string = '';
  importedFeature: Feature | undefined;
  interaction: any = null;
  interactionType: string | undefined
  modifiedFeatures: boolean = false;
  appName = 'Final Approach Rust UI';
  version = '1.0.0';
  persona: string = Personas.PREACHER;

  constructor(
    private dialog: MatDialog,
    private mapService: MapService,
    private appService: AppService,
    private toastr: ToastrService,
    private pingService: PingService
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
    this.selectInteraction = new Select({
      style: (featureLike) => {
        let feature = featureLike instanceof Feature ? featureLike : this.source.getFeatureById(featureLike.get('id'));
        feature.set('selected', true);
        const s = this.featureFunction(featureLike);

        if (featureLike instanceof Feature) {
          feature = featureLike; // already the real one
        } else {
          const id = featureLike.get('id'); // from RenderFeature's properties
          feature = this.source.getFeatureById(id); // get from source
        }
        this.lastSelectedFeature = feature;
        // reuse your text logic
        // Optionally emphasize selection:
        const stroke = s.getStroke();
        if (stroke) stroke.setWidth((stroke.getWidth?.() ?? 3) + 2);
        return s;
      }
    });
    this.map.addInteraction(this.selectInteraction);
    this.map.addInteraction(this.dragAndDropInteraction);
    this.selectInteraction.on('select', e => {
      if (e.deselected) {
        if (this.lastSelectedFeature) {
          this.lastSelectedFeature.set('selected', false);
          this.lastSelectedFeature = undefined;
        }
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
        console.log("Selected feature is :", this.lastSelectedFeature.get('territoryName'));
      }

      /*this.mapDesign.territoryMapList.forEach(t => {
        if (t.territoryNumber == this.territoryCustomNumber.value) {
          this.lastSelectedTerritoryMap = t;
        }
      })*/
    });


    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'F5') {
        return;
      } else if (event.key === 'Escape') {
        this.removeInteraction();
        this.modeSelected = '';
        this.lastSelectedFeature = undefined;
        this.territoryCustomNumber.setValue(null);
        this.territoryCustomName.setValue(null);
        this.note.setValue(null);
      } else if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        this.saveModifications();
      } else if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        this.drawPolygon();
      } else if (event.ctrlKey && event.key === 'e') {
        event.preventDefault();
        this.editFeature();
      } else if (event.ctrlKey && event.key === 'g') {
        event.preventDefault();
        this.openGoogleTab();
      } else if (event.key === 'Delete' && this.lastSelectedFeature) {
        event.preventDefault();
        this.deleteFeature();
      } else if (event.ctrlKey && event.key === 'i') {
        event.preventDefault();
        this.openDialog();
      } else if (event.key === 'F1') {
        event.preventDefault();
        this.openDocumentation();
      } else if (event.key === 'F2') {
        event.preventDefault();
        this.persona = Personas.DESIGNER;
      } else if (event.key === 'F3') {
        event.preventDefault();
        this.persona = Personas.MANAGER;
      } else if (event.key === 'F4') {
        event.preventDefault();
        this.persona = Personas.PREACHER;
      } else if (event.key === 'F5') {
        event.preventDefault();
        this.persona = Personas.GROUP_LEADER;
      }
    });

    // Listen to click on map feature
    /*this.map.on('click', (event) => {
      const feature = this.map?.forEachFeatureAtPixel(event.pixel, (feature) => {
        return feature;
      });
    });*/

    // check if there is a url parameter to load a specific map design
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      this.persona = Personas.PREACHER
      // The map is loaded from the URL parameter, id=<id>,folder=<folder>
      const path = urlParams.get('path');
      console.log('Loading map design with id:', id, 'and path:', path);
      this.mapService.loadMapDesignById(id, path).subscribe({

      });
    } else {
      this.persona = Personas.DESIGNER;
      this.pingService.ping().subscribe(response => {
        console.log('Ping response:', response);
        this.persona = Personas.MANAGER;
      });
      this.appService.getAppInfo().subscribe(info => {
        this.appName = info.appName;
        this.version = info.version;
      });
      this.loadHome()
      this.loadMapDesign()
    }
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

  featureFunction(featureLike:FeatureLike) :Style {

    let style = this.createStyle();

    let feature;

    if (featureLike instanceof Feature) {
      feature = featureLike; // already the real one
    } else {
      const id = featureLike.get('id'); // from RenderFeature's properties
      feature = this.source.getFeatureById(id); // get from source
    }

    if (feature.get('selected')) {
      style = this.createStyle([0, 255, 0, 0.05],[255, 0, 0, 0.5],5,'#001010','#fff',2);
    } else if (!this.showOsmData && feature.get('residentialUnit')) {
      style = new Style({});
    } else if (this.showOsmData && feature.get('residentialUnit')) {
      style = this.createStyle([0, 255, 0, 0.05],[0, 0, 255, 0.05],5,'#00c4ff','#fff',2);
    } else if (feature.get('imported') && !this.hideImportedFeature) {
      style = this.createStyle([0, 0, 0, 0.05],[255, 0, 0, 0.25],4,'#000','#fff',3);
    } else if (feature.get('imported') && this.hideImportedFeature) {
      style = new Style({});
    } else if (feature.get('draft') == false) {
      style = this.createStyle([0, 0, 255, 0.1],[0, 100, 0, 0.5],5,'#007700','#fff',2);
    }


    if (this.map.getView().getZoom() > 17) {
      style.getText().setText(feature.get('territoryNumber') + ' ' + feature.get('territoryName') + "\n" + feature.get('additionalNote'));
    } else if (this.map.getView().getZoom() > 16) {
      style.getText().setText(feature.get('territoryNumber') + ' ' + feature.get('territoryName'));
    }  else if (this.map.getView().getZoom() > 15) {
      style.getText().setText(feature.get('territoryNumber'));
    } else {
      style.getText().setText('');
    }
    return style;
  }

  openDialog(): void {
    this.dialog.open(InfoDialogComponent, {
      width: '1200px',
      minWidth: '500px',
      data: {
        appName: this.appName,
        version: this.version,
        home: this.home
      }
    });
  }

  openDocumentation(): void {
    this.dialog.open(DocumentationComponent, {
      minWidth: '90%',
      data: {
        appName: this.appName,
        version: this.version
      }
    })
  }

  openPersonaDialog(): void {
    this.dialog.open(PersonaComponent, {
      width: '1200px',
      minWidth: '500px',
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
      this.home = home;
      if (home && this.map) {
        this.map.getView().setCenter(home.coordinates);
        this.map.getView().setZoom(home.zoom);
      }
    });
  }

  getCoordinates(coordinates: number[] | undefined): Coordinate {
    if (coordinates == undefined) return [0, 0];
    return toLonLat(coordinates)
  }

  openGoogleTab(): void {
    const url = `https://www.google.com/maps/@${this.getCoordinates(this.map.getView().getCenter()).toString().split(',')[1]},${this.getCoordinates(this.map.getView().getCenter()).toString().split(',')[0]},${this.map.getView().getZoom()}z`;
    window.open(url, '_blank');
  }

  drawPolygon() {
    this.territoryNumber.setValue('');
    this.addInteraction("Polygon");
    this.modeSelected = 'polygon';
  }

  editFeature() {

    if (this.interaction != null) {
      this.removeInteraction();
    }

    this.interaction = new Modify({
      source: this.source
    });

    let modify: Modify = this.interaction;

    modify.on('modifyend', evt => {

      console.log("modifyend", evt);
      let modifiedFeature = evt.features.getArray()[0];
      this.territoryCustomNumber.setValue(modifiedFeature.get('territoryNumber'));
      this.territoryCustomName.setValue(modifiedFeature.get('territoryName'));
      this.note.setValue(modifiedFeature.get('note'));
      this.lastSavedTerritoryName = this.territoryCustomNumber.value + ' ' + this.territoryCustomName.value;

      /*FIXME this.map.territoryMapList.forEach(t => {
        if (t.territoryNumber == this.territoryCustomNumber.value) {
          let data = this.wktFormat.writeGeometry(<Geometry>modifiedFeature.getGeometry());
          t.simpleFeatureData = data;
          t.draft = true; // it remains a "draft" until you activate it
          t.lastUpdate = new Date();
          this.featureModified = true;
        }
      })*/

    })

    modify.on('change', evt => {
      this.modifiedFeatures = true;
    })

    this.map?.addInteraction(this.interaction);
    this.modeSelected = 'edit';
    this.interactionType = 'EDIT'
  }

  private addInteraction(type: string) {
    this.removeInteraction();
    this.interactionType = 'DRAW';
    this.interaction = new Draw({
      type: type as any,
      source: this.source
    });
    let draw: Draw = this.interaction;
    draw.on('drawend', evt => {
      console.log("drawend", evt);
      this.modifiedFeatures = true;
      this.lastSelectedFeature = evt.feature;
      this.lastSelectedFeature.set('draft', true);
    });

    this.map?.addInteraction(this.interaction);
    this.modeSelected = 'navigate';
  }

  removeInteraction() {
    this.map?.removeInteraction(this.interaction);
    this.interaction = null;
    this.interactionType = undefined
  }

  saveModifications() {
    this.modifiedFeatures = false;
    // list all modified features
    let i = 0; // if saving multiple features at once, you need a different number for each one
    this.source.getFeatures().forEach(feature => {

        if (feature.get('draft') == false) {
          return;
        }

        if (feature.get('deleteID') == true) {
          console.log("Deleting feature with id:", feature.get('deleteID'));
          this.mapService.deleteMapDesign(feature.get('deleteID')).subscribe(()=>{
            console.log("feature with id:", feature.get('deleteID'), "deleted successfully");
          })
        }

        feature.set('draft', false);
        if (!feature.get('territoryNumber')) {
          feature.set('territoryNumber', new Date().getTime() + i); // additional incremental
          feature.set('territoryName','DRAFT')
          feature.set('additionalNote','')
          i++;
        }

        let mapDesign = this.generateMapDesignFromFeature(feature);

        // Here you would typically save the feature to your backend or service
        this.mapService.saveMapDesign(mapDesign).subscribe({
          "next": (response) => {
            this.toastr.success('Map Design saved successfully');
          },
          "error": (error) => {
            console.log(error)
            this.toastr.error('Error saving feature:', error);
          }
        })
    });
  }

  private generateMapDesignFromFeature(feature:Feature<Geometry>) {
    let mapDesign: TerritoryMap = {
      draft: false,
      territoryNumber: feature.get('territoryNumber') || '',
      territoryName: feature.get('territoryName') || '',
      additionalNote: feature.get('additionalNote') || '',
      formerTerritoryNumber: null,
      simpleFeatureData: this.wktFormat.writeGeometry(feature.getGeometry() as Geometry) || '',
      simpleFeatureType: 'Polygon',
      note: feature.get('note') || '',
      lastUpdate: new Date(),
      streetList: [],
      residentialUnits: [],
      url: ''
    }
    return mapDesign;
  }

  deleteFeature() {
    this.mapService.deleteMapDesign(this.lastSelectedFeature.get("territoryNumber")).subscribe({
      next: (response) => {
        this.toastr.success('Feature deleted successfully');
        this.source.removeFeature(this.lastSelectedFeature)
        this.lastSelectedFeature = undefined;
      },
      error: (error) => {
        console.error('Error deleting feature:', error);
        this.toastr.error('Error deleting feature: ' + error.message);
      }
    })

  }

  loadMapDesign() {
    this.mapService.loadMapDesign().subscribe({
      next: (mapDesigns: TerritoryMap[]) => {
        this.source.clear();

        mapDesigns.forEach(mapDesign => {
          this.loadTerritoryMap(mapDesign);
        });
      },
      error: (error) => {
        console.error('Error loading map design:', error);
      }
    });
  }

  private loadTerritoryMap(mapDesign: TerritoryMap) {
    if (mapDesign.simpleFeatureData) {
      let geometry = this.wktFormat.readGeometry(mapDesign.simpleFeatureData);
      let feature = new Feature({
        geometry: geometry,
        territoryNumber: mapDesign.territoryNumber,
        territoryName: mapDesign.territoryName || mapDesign.territoryNumber, // if empty, it will be set to territoryNumber
        additionalNote: mapDesign.additionalNote,
        note: mapDesign.note,
        draft: mapDesign.draft,
        imported: false // Set to true if the feature is imported
      });
      feature.set('name', feature.get('territoryName'));
      this.source.addFeature(feature);
    }
  }

  protected saveMapForTerritory() {
    let mapDesign:TerritoryMap = this.generateMapDesignFromFeature(this.lastSelectedFeature);
    mapDesign.draft = false;

    mapDesign.territoryNumber = this.territoryCustomNumber.value;
    mapDesign.territoryName = this.territoryCustomName.value;
    mapDesign.additionalNote = this.note.value;
    // ensure that the feature is deleted from the backend, if it exists, and it will be replaced by the new one
    this.lastSelectedFeature.set('deleteID', this.lastSelectedFeature.get('territoryNumber'));
    // then a new real number is assigned to the feature
    this.lastSelectedFeature.set('territoryNumber', mapDesign.territoryNumber);
    this.lastSelectedFeature.set('territoryName', mapDesign.territoryName);
    this.lastSelectedFeature.set('additionalNote', mapDesign.additionalNote);
    this.lastSelectedFeature.set('draft', true);

    console.log(mapDesign)
  }
}
