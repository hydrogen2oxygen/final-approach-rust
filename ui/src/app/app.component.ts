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
import {createEmpty, extend, isEmpty} from 'ol/extent';
import {Congregation, Preacher, Territory} from './domains/Congregation';
import { jsPDF } from 'jspdf';
import { buffer } from 'ol/extent';
import { click, shiftKeyOnly } from 'ol/events/condition';
import {SettingsComponent} from './components/settings/settings.component';

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
  hideImportedFeature:boolean = false;
  home: any;
  note = new FormControl('');
  territoryNumber = new FormControl('');
  territoryName = new FormControl('');
  territoryCustomNumber = new FormControl('');
  territoryCustomName = new FormControl('');
  preacherName = new FormControl('');

  congregation: Congregation | undefined;
  territoriesSorted: Territory[] = [];
  territoriesNoContacts:Territory[] = [];
  territoriesOlder8Months:Territory[] = [];
  territoriesOlder4Months:Territory[] = [];
  territoriesAssigned:Territory[] = [];
  territoriesToBeAssigned:Territory[] = [];
  territoriesArchived:Territory[] = [];

  selectInteraction = new Select();
  dragAndDropInteraction: DragAndDrop | undefined;
  wktFormat = new WKT();
  modeSelected = '';
  lastSelectedFeature: Feature | undefined;
  lastSavedTerritoryName: string = '';
  interaction: any = null;
  interactionType: string | undefined
  modifiedFeatures: boolean = false;
  appName = 'Final Approach Rust UI';
  version = '1.0.0';
  persona: string = localStorage.getItem('persona') || Personas.DESIGNER;

  constructor(
    private dialog: MatDialog,
    private mapService: MapService,
    private appService: AppService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {

    this.osmLayer = new TileLayer({
          source: new OSM({
            crossOrigin: 'anonymous',
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
      multi: true,
      condition: click,
      toggleCondition: shiftKeyOnly,
      style: (featureLike) => {
        const s = this.featureFunction(featureLike);

        const stroke = s.getStroke();
        if (stroke) {
          stroke.setWidth((stroke.getWidth?.() ?? 3) + 2);
        }

        return s;
      }
    });
    this.map.addInteraction(this.selectInteraction);
    this.initKmlDragAndDrop();
    this.selectInteraction.on('select', e => {

      e.deselected.forEach(feature => {
        feature.set('selected', false);
        feature.setStyle(undefined);
      });

      e.selected.forEach(feature => {
        feature.set('selected', true);
        feature.setStyle(undefined);
      });

      const selectedFeatures = this.selectInteraction.getFeatures().getArray() as Feature<Geometry>[];

      if (selectedFeatures.length === 0) {
        this.lastSelectedFeature = undefined;

        this.territoryCustomNumber.setValue(null);
        this.territoryCustomName.setValue(null);
        this.note.setValue(null);

        this.vectorLayer.changed();
        return;
      }

      this.lastSelectedFeature = selectedFeatures[selectedFeatures.length - 1];
      this.territoryCustomNumber.setValue(this.lastSelectedFeature.get('territoryNumber'));
      this.territoryCustomName.setValue(this.lastSelectedFeature.get('territoryName'));
      this.note.setValue(this.lastSelectedFeature.get('note'));
      this.vectorLayer.changed();
    });


    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'F5') {
        return;
      } else if (event.key === 'Escape') {
        this.removeInteraction();
        this.modeSelected = '';
        this.clearSelectedFeatures();
      } else if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        this.saveModifications();
      } else if (this.persona == Personas.DESIGNER && event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        this.drawPolygon();
      } else if (this.persona == Personas.DESIGNER && event.ctrlKey && event.key === 'e') {
        event.preventDefault();
        this.editFeature();
      } else if (event.ctrlKey && event.key === 'g') {
        event.preventDefault();
        this.openGoogleTab();
      } else if (this.persona == Personas.DESIGNER && event.key === 'Delete' && this.lastSelectedFeature) {
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

      localStorage.setItem('persona', this.persona);
    });

    // check if there is a url parameter to load a specific map design
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      this.persona = Personas.PREACHER
      // The map is loaded from the URL parameter, id=<id>,folder=<folder>
      const path = urlParams.get('path');
      this.mapService.loadMapDesignById(id, path).subscribe( (mapDesign:TerritoryMap) => {
        this.loadTerritoryMap(mapDesign);
      });
    } else {

      this.appService.getAppInfo().subscribe(info => {
        this.appName = info.appName;
        this.version = info.version;
      });

      this.loadHome()
      this.loadMapDesign()
      this.reloadCongregationData();
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

    if (feature.get('printHidden')) {
      return new Style({});
    }

    let strokeWidth = this.map.getView().getZoom() - 12;
    if (strokeWidth < 0) strokeWidth = 0.1
    if (strokeWidth > 6) strokeWidth = 6

    if (feature.get('selected')) {
      style = this.createStyle([0, 255, 0, 0.05],[255, 0, 0, 0.5],strokeWidth,'#001010','#fff',2);
    } else if (!this.showOsmData && feature.get('residentialUnit')) {
      style = new Style({});
    } else if (this.showOsmData && feature.get('residentialUnit')) {
      style = this.createStyle([0, 255, 0, 0.05],[0, 0, 255, 0.05],strokeWidth,'#00c4ff','#fff',2);
    } else if (feature.get('imported') && !this.hideImportedFeature) {
      style = this.createStyle([0, 0, 0, 0.05],[255, 0, 0, 0.25],strokeWidth,'#000','#fff',3);
    } else if (feature.get('imported') && this.hideImportedFeature) {
      style = new Style({});
    } else if (feature.get('draft') == false) {
      style = this.createStyle([0, 0, 255, 0.1],[0, 100, 0, 0.5],strokeWidth,'#007700','#fff',2);
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

      let modifiedFeature = evt.features.getArray()[0];
      modifiedFeature.set('draft', true);
      this.territoryCustomNumber.setValue(modifiedFeature.get('territoryNumber'));
      this.territoryCustomName.setValue(modifiedFeature.get('territoryName'));
      this.note.setValue(modifiedFeature.get('note'));
      this.lastSavedTerritoryName = this.territoryCustomNumber.value + ' ' + this.territoryCustomName.value;
      this.modifiedFeatures = true;
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

      if (feature.get('deleteID')) {
        this.mapService.deleteMapDesign(feature.get('deleteID')).subscribe(() => {
          this.toastr.warning("mapDesign with id: " + feature.get('deleteID')  +" deleted successfully");
        })
      }

      if (feature.get('draft') == false) {
        return;
      }

      feature.set('draft', false);
      if (!feature.get('territoryNumber')) {
        feature.set('territoryNumber', new Date().getTime() + i); // additional incremental
        feature.set('territoryName', 'DRAFT')
        feature.set('additionalNote', '')
        i++;
      }

      let mapDesign = this.generateMapDesignFromFeature(feature);

      this.mapService.saveMapDesign(mapDesign).subscribe({
        "next": (response) => {
          this.toastr.success(`Map Design with number ${mapDesign.territoryNumber} saved successfully`);
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
    let territory = this.territoriesSorted.find(t => t.number == this.lastSelectedFeature.get("territoryNumber"))
    if (territory) {
      if (!confirm("This territory is currently in use. Are you sure you want to delete it?")) return;
      this.mapService.deleteTerritory(territory.number).subscribe(() => {
        this.toastr.warning("Territory " + territory.number + " deleted successfully");
      })
    }

    this.mapService.deleteMapDesign(this.lastSelectedFeature.get("territoryNumber")).subscribe({
      next: (response) => {
        this.toastr.success('Feature deleted successfully');
        this.source.removeFeature(this.lastSelectedFeature)
        this.lastSelectedFeature = undefined;
      },
      error: (error) => {
        console.error('Error deleting feature:', error);
        this.source.removeFeature(this.lastSelectedFeature)
        this.lastSelectedFeature = undefined;
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

    let territory = new Territory();
    territory.number = mapDesign.territoryNumber;
    territory.name = mapDesign.territoryName;

    this.mapService.saveTerritory(territory).subscribe(()=>{
      this.toastr.success('Territory saved successfully');
    })

    console.log(mapDesign)
  }

  private initKmlDragAndDrop(): void {
    this.dragAndDropInteraction = new DragAndDrop({
      formatConstructors: [KML as any],
      projection: this.view.getProjection()
    });

    this.dragAndDropInteraction.on('addfeatures', (event: any) => {
      const features = event.features || [];

      if (!features.length) {
        this.toastr.warning('No features found in dropped KML file');
        return;
      }

      this.addImportedKmlFeatures(features, 'Dropped KML');
    });

    this.map?.addInteraction(this.dragAndDropInteraction);
  }

  onKmlFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.importKmlFile(file);

    // wichtig: erlaubt danach dieselbe Datei erneut auszuwählen
    input.value = '';
  }

  private importKmlFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.kml')) {
      this.toastr.error('Please select a .kml file');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const kmlText = String(reader.result || '');
      this.importKmlText(kmlText, file.name);
    };

    reader.onerror = () => {
      this.toastr.error('Could not read KML file');
    };

    reader.readAsText(file);
  }

  private importKmlText(kmlText: string, fileName: string): void {
    try {
      const kmlFormat = new KML({
        extractStyles: false
      });

      const features = kmlFormat.readFeatures(kmlText, {
        dataProjection: 'EPSG:4326',
        featureProjection: this.view.getProjection()
      }) as Feature<Geometry>[];

      if (!features.length) {
        this.toastr.warning('No features found in KML file');
        return;
      }

      this.addImportedKmlFeatures(features, fileName);
    } catch (error) {
      console.error('KML import failed:', error);
      this.toastr.error('KML import failed');
    }
  }

  private addImportedKmlFeatures(features: Feature<Geometry>[], fileName: string): void {
    const extent = createEmpty();

    features.forEach((feature, index) => {
      const kmlName = feature.get('name');

      feature.set('imported', true);
      feature.set('draft', true);

      if (!feature.get('territoryName')) {
        feature.set('territoryName', kmlName || fileName.replace('.kml', ''));
      }

      if (!feature.get('territoryNumber')) {
        feature.set('territoryNumber', '');
      }

      if (!feature.get('additionalNote')) {
        feature.set('additionalNote', 'Imported from KML');
      }

      if (!feature.get('note')) {
        feature.set('note', '');
      }

      feature.set('kmlFileName', fileName);
      feature.set('kmlImportIndex', index);

      const geometry = feature.getGeometry();
      if (geometry) {
        extend(extent, geometry.getExtent());
      }
    });

    this.source.addFeatures(features);
    this.modifiedFeatures = true;

    if (!isEmpty(extent)) {
      this.map?.getView().fit(extent, {
        padding: [80, 80, 80, 80],
        maxZoom: 17,
        duration: 500
      });
    }

    this.toastr.success(`${features.length} KML feature(s) imported`);
  }

  reloadCongregationData():void {

    this.mapService.loadCongregation().subscribe({"next": congregation => {
      this.congregation = congregation[0];
      if (!this.congregation) {
        console.log("No Congregation found. Creating a new one")
        this.congregation = new Congregation();
        this.mapService.saveCongregation(this.congregation).subscribe(()=> console.log("Congregation saved"))
      }
    },
    "error": (error) => {
      console.log(error)
      this.toastr.error('Error loading congregation:', error);
    }});

    const now:Date = new Date();
    const eightMonthsAgo:Date = new Date(now.getFullYear(), now.getMonth() - 8, now.getDate());
    const fourMonthsAgo:Date = new Date(now.getFullYear(), now.getMonth() - 4, now.getDate());

    this.mapService.loadTerritories().subscribe(territories => {

      this.territoriesSorted = territories.sort((a, b) => (a.number > b.number ? 1 : -1));

      territories.forEach((t:Territory) => {
        if (t.registryEntryList.length == 0) {
          this.territoriesToBeAssigned.push(t);
        } else if (t.noContacts && !t.archive){
          this.territoriesNoContacts.push(t);
        } else if (t.archive) {
          this.territoriesArchived.push(t);
        } else if (t.registryEntryList[t.registryEntryList.length - 1].preacher.name == 'Congregation') {
          this.territoriesToBeAssigned.push(t);
        } else if (new Date(t.date) < eightMonthsAgo) {
          this.territoriesOlder8Months.push(t);
        } else if (new Date(t.date) < fourMonthsAgo) {
          this.territoriesOlder4Months.push(t);
        } else {
          this.territoriesAssigned.push(t);
        }
      });

      this.territoriesNoContacts = this.territoriesNoContacts.sort((a, b) => (new Date(a.date) > new Date(b.date) ? 1 : -1));
      this.territoriesArchived = this.territoriesArchived.sort((a, b) => (new Date(a.date) > new Date(b.date) ? 1 : -1));
      this.territoriesToBeAssigned = this.territoriesToBeAssigned.sort((a, b) => (new Date(a.date) > new Date(b.date) ? 1 : -1));
      this.territoriesOlder4Months = this.territoriesOlder4Months.sort((a, b) => (new Date(a.date) > new Date(b.date) ? 1 : -1));
      this.territoriesOlder8Months = this.territoriesOlder8Months.sort((a, b) => (new Date(a.date) > new Date(b.date) ? 1 : -1));
    })
  }

  exportSelectedFeatureAsPdf(): void {
    if (!this.map || !this.lastSelectedFeature) {
      this.toastr.warning('No territory selected');
      return;
    }

    const selectedFeature = this.lastSelectedFeature;
    const geometry = selectedFeature.getGeometry();

    if (!geometry) {
      this.toastr.warning('Selected territory has no geometry');
      return;
    }

    const oldCenter = this.map.getView().getCenter();
    const oldZoom = this.map.getView().getZoom();

    // @ts-ignore
    const oldPrintHiddenValues = new Map<Feature<Geometry>, any>();
    // @ts-ignore
    const oldSelectedValues = new Map<Feature<Geometry>, any>();

    this.source.getFeatures().forEach(feature => {
      // @ts-ignore
      oldPrintHiddenValues.set(feature as Feature<Geometry>, feature.get('printHidden'));
      // @ts-ignore
      oldSelectedValues.set(feature as Feature<Geometry>, feature.get('selected'));

      if (feature !== selectedFeature) {
        feature.set('printHidden', true);
        feature.set('selected', false);
      }
    });

    selectedFeature.set('printHidden', false);
    selectedFeature.set('selected', true);

    this.vectorLayer.changed();

    const extent = geometry.getExtent();
    const printExtent = buffer(extent, 20);

    this.map.getView().fit(printExtent, {
      padding: [25, 25, 25, 25],
      maxZoom: 21,
      duration: 0
    });

    this.map.once('rendercomplete', () => {
      try {
        const mapCanvas = document.createElement('canvas');
        const size = this.map!.getSize();

        if (!size) {
          this.toastr.error('Could not determine map size');
          return;
        }

        mapCanvas.width = size[0];
        mapCanvas.height = size[1];

        const mapContext = mapCanvas.getContext('2d');

        if (!mapContext) {
          this.toastr.error('Could not create canvas context');
          return;
        }

        const canvases = this.map!.getViewport().querySelectorAll<HTMLCanvasElement>(
          '.ol-layer canvas, canvas.ol-layer'
        );

        canvases.forEach(canvas => {
          if (canvas.width === 0 || canvas.height === 0) {
            return;
          }

          const opacity = canvas.parentElement?.style.opacity || canvas.style.opacity;
          mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);

          const transform = canvas.style.transform;

          if (transform) {
            const matrix = transform
              .match(/^matrix\(([^\)]*)\)$/)?.[1]
              .split(',')
              .map(Number);

            if (matrix && matrix.length === 6) {
              mapContext.setTransform(
                matrix[0],
                matrix[1],
                matrix[2],
                matrix[3],
                matrix[4],
                matrix[5]
              );
            }
          } else {
            mapContext.setTransform(1, 0, 0, 1, 0, 0);
          }

          mapContext.drawImage(canvas, 0, 0);
        });

        mapContext.setTransform(1, 0, 0, 1, 0, 0);
        mapContext.globalAlpha = 1;

        const image = mapCanvas.toDataURL('image/png');

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const margin = 8;
        const titleHeight = 10;

        const territoryNumber = selectedFeature.get('territoryNumber') || '';
        const territoryName = selectedFeature.get('territoryName') || '';
        const title = `${territoryNumber} ${territoryName}`.trim() || 'Gebietskarte';

        pdf.setFontSize(14);
        pdf.text(title, margin, 10);

        pdf.addImage(
          image,
          'PNG',
          margin,
          titleHeight + margin,
          pageWidth - margin * 2,
          pageHeight - titleHeight - margin * 2
        );

        const filename = `${title.replace(/[^\wäöüÄÖÜß-]+/g, '_')}.pdf`;
        pdf.save(filename);

      } finally {
        this.source.getFeatures().forEach(feature => {
          // @ts-ignore
          feature.set('printHidden', oldPrintHiddenValues.get(feature as Feature<Geometry>));
          // @ts-ignore
          feature.set('selected', oldSelectedValues.get(feature as Feature<Geometry>));
        });

        if (oldCenter) {
          this.map!.getView().setCenter(oldCenter);
        }

        if (oldZoom !== undefined) {
          this.map!.getView().setZoom(oldZoom);
        }

        selectedFeature.set('selected', true);
        this.lastSelectedFeature = selectedFeature;

        this.vectorLayer.changed();
        this.map!.renderSync();
      }
    });

    this.map.renderSync();
  }

  private getSelectedFeatures(): Feature<Geometry>[] {
    return this.selectInteraction.getFeatures().getArray() as Feature<Geometry>[];
  }

  private async renderFeatureToImage(featureToRender: Feature<Geometry>): Promise<{ title: string, image: string }> {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    const geometry = featureToRender.getGeometry();
    if (!geometry) {
      throw new Error('Feature has no geometry');
    }

    const oldCenter = this.map.getView().getCenter();
    const oldZoom = this.map.getView().getZoom();

    // @ts-ignore
    const oldPrintHiddenValues = new Map<Feature<Geometry>, any>();
    // @ts-ignore
    const oldSelectedValues = new Map<Feature<Geometry>, any>();

    this.source.getFeatures().forEach(feature => {
      const typedFeature = feature as Feature<Geometry>;
      // @ts-ignore
      oldPrintHiddenValues.set(typedFeature, typedFeature.get('printHidden'));
      // @ts-ignore
      oldSelectedValues.set(typedFeature, typedFeature.get('selected'));

      if (typedFeature !== featureToRender) {
        typedFeature.set('printHidden', true);
        typedFeature.set('selected', false);
      } else {
        typedFeature.set('printHidden', false);
        typedFeature.set('selected', true);
      }
    });

    this.vectorLayer.changed();

    const extent = geometry.getExtent();
    const printExtent = buffer(extent, 20);

    this.map.getView().fit(printExtent, {
      padding: [25, 25, 25, 25],
      maxZoom: 21,
      duration: 0
    });

    const image = await new Promise<string>((resolve, reject) => {
      this.map!.once('rendercomplete', () => {
        try {
          const size = this.map!.getSize();
          if (!size) {
            reject(new Error('Could not determine map size'));
            return;
          }

          const mapCanvas = document.createElement('canvas');
          mapCanvas.width = size[0];
          mapCanvas.height = size[1];

          const mapContext = mapCanvas.getContext('2d');
          if (!mapContext) {
            reject(new Error('Could not create canvas context'));
            return;
          }

          const canvases = this.map!.getViewport().querySelectorAll<HTMLCanvasElement>(
            '.ol-layer canvas, canvas.ol-layer'
          );

          canvases.forEach(canvas => {
            if (canvas.width === 0 || canvas.height === 0) {
              return;
            }

            const opacity = canvas.parentElement?.style.opacity || canvas.style.opacity;
            mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);

            const transform = canvas.style.transform;

            if (transform) {
              const matrix = transform
                .match(/^matrix\(([^\)]*)\)$/)?.[1]
                .split(',')
                .map(Number);

              if (matrix && matrix.length === 6) {
                mapContext.setTransform(
                  matrix[0], matrix[1],
                  matrix[2], matrix[3],
                  matrix[4], matrix[5]
                );
              }
            } else {
              mapContext.setTransform(1, 0, 0, 1, 0, 0);
            }

            mapContext.drawImage(canvas, 0, 0);
          });

          mapContext.setTransform(1, 0, 0, 1, 0, 0);
          mapContext.globalAlpha = 1;

          resolve(mapCanvas.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      });

      this.map!.renderSync();
    });

    this.source.getFeatures().forEach(feature => {
      const typedFeature = feature as Feature<Geometry>;
      // @ts-ignore
      typedFeature.set('printHidden', oldPrintHiddenValues.get(typedFeature));
      // @ts-ignore
      typedFeature.set('selected', oldSelectedValues.get(typedFeature));
    });

    if (oldCenter) {
      this.map.getView().setCenter(oldCenter);
    }
    if (oldZoom !== undefined) {
      this.map.getView().setZoom(oldZoom);
    }

    this.vectorLayer.changed();
    this.map.renderSync();

    const territoryNumber = featureToRender.get('territoryNumber') || '';
    const territoryName = featureToRender.get('territoryName') || '';
    const title = `${territoryNumber} ${territoryName}`.trim() || 'Gebietskarte';

    return { title, image };
  }

  async exportSelectedFeaturesAsGridPdf(): Promise<void> {
    const selectedFeatures = this.getSelectedFeatures();

    if (!selectedFeatures.length) {
      this.toastr.warning('No territory selected');
      return;
    }

    const featuresToPrint = selectedFeatures.slice(0, 4);

    if (selectedFeatures.length > 4) {
      this.toastr.info('Only the first 4 selected territories will be printed');
    }

    try {
      const renderedItems: { title: string, image: string }[] = [];

      for (const feature of featuresToPrint) {
        const item = await this.renderFeatureToImage(feature);
        renderedItems.push(item);
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const outerMargin = 6;
      const gap = 4;

      const cellWidth = (pageWidth - outerMargin * 2 - gap) / 2;
      const cellHeight = (pageHeight - outerMargin * 2 - gap) / 2;

      const titleHeight = 6;
      const imageTopOffset = 7;

      const slots = [
        { x: outerMargin, y: outerMargin },
        { x: outerMargin + cellWidth + gap, y: outerMargin },
        { x: outerMargin, y: outerMargin + cellHeight + gap },
        { x: outerMargin + cellWidth + gap, y: outerMargin + cellHeight + gap }
      ];

      renderedItems.forEach((item, index) => {
        const slot = slots[index];

        pdf.setDrawColor(120);
        pdf.rect(slot.x, slot.y, cellWidth, cellHeight);

        pdf.setFontSize(9);
        pdf.text(item.title, slot.x + 1.5, slot.y + 4);

        pdf.addImage(
          item.image,
          'PNG',
          slot.x + 1,
          slot.y + imageTopOffset,
          cellWidth - 2,
          cellHeight - imageTopOffset - 1
        );
      });

      const filename =
        renderedItems.length === 1
          ? `${renderedItems[0].title.replace(/[^\wäöüÄÖÜß-]+/g, '_')}.pdf`
          : `territories_4up.pdf`;

      pdf.save(filename);

    } catch (error: any) {
      console.error(error);
      this.toastr.error('Failed to create PDF');
    }
  }

  private clearSelectedFeatures(): void {
    this.selectInteraction.getFeatures().forEach(feature => {
      feature.set('selected', false);
      feature.setStyle(undefined);
    });

    this.selectInteraction.getFeatures().clear();

    this.lastSelectedFeature = undefined;

    this.territoryCustomNumber.setValue(null);
    this.territoryCustomName.setValue(null);
    this.note.setValue(null);

    this.vectorLayer.changed();
  }

  protected assignPreacher() {
    console.log("Assigning Preacher", this.preacherName.value)
    let preacher = this.congregation.preacherList.find(p => p.name == this.preacherName.value)
    console.log(preacher)
    if (!preacher) {
      console.log("Preacher not found")
      preacher = new Preacher();
      preacher.name = this.preacherName.value;
      this.congregation.preacherList.push(preacher);
      this.preacherName.setValue(undefined);
      console.log(this.congregation.preacherList)
    }
    let territory = this.territoriesSorted.find(t => t.number == this.lastSelectedFeature.get('territoryNumber'));
    if (territory) {
      console.log("Territory found")
      console.log(territory)
    }
  }

  protected openSettings() {
    const dialogRef = this.dialog.open(SettingsComponent, {
      minWidth: '50%',
      data: {
        persona: this.persona
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }

      this.congregation = result.congregation;
    });
  }

}
