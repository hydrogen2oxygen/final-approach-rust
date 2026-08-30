import {Component, OnDestroy, OnInit} from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import Geolocation from 'ol/Geolocation';
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
import {Circle as CircleStyle, Fill, Stroke, Style, Text} from 'ol/style';
import {FeatureLike} from 'ol/Feature';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {DragAndDrop, Draw, Modify, Select} from 'ol/interaction';
import {GeoJSON, GPX, IGC, KML, TopoJSON, WKT} from 'ol/format';
import {Feature} from 'ol';
import {TerritoryMap, Personas} from './domains/MapDesign';
import {Geometry, MultiPolygon, Point, Polygon} from 'ol/geom';
import {DocumentationComponent} from './components/documentation/documentation.component';
import {PersonaComponent} from './components/persona/persona.component';
import {Coordinate} from 'ol/coordinate';
import {toLonLat} from 'ol/proj';
import {createEmpty, extend, isEmpty} from 'ol/extent';
import {
  Congregation,
  DoNotVisit,
  Preacher,
  RegistryEntry,
  Territory,
  TerritoryOverview
} from './domains/Congregation';
import {jsPDF} from 'jspdf';
import {buffer} from 'ol/extent';
import {click, shiftKeyOnly} from 'ol/events/condition';
import {SettingsComponent} from './components/settings/settings.component';
import {getCenter} from 'ol/extent';
import {transform} from 'ol/proj';
import {ApiService} from './services/api.service';
import {concatMap, from, tap, toArray} from 'rxjs';
import {RemoteOverviewHistoryDialogComponent} from './components/remote-overview-history-dialog/remote-overview-history-dialog.component';
import {
  RemoteOverviewHistoryEntry,
  RemoteOverviewHistoryService
} from './services/remote-overview-history.service';
import {
  PreacherTerritoriesDialogComponent,
  PreacherTerritoryAssignment
} from './components/preacher-territories-dialog/preacher-territories-dialog.component';
import {
  TerritoryDetailsDialogComponent,
  TerritoryDetailsItem
} from './components/territory-details-dialog/territory-details-dialog.component';

interface SearchResult {
  label: string;
  details: string;
  preacherName?: string;
  territoryNumber?: string;
  type: 'Territory' | 'Preacher';
}


@Component({
  selector: 'app-root',
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, ReactiveFormsModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  map: Map | undefined;
  view: View = new View();
  osmLayer: TileLayer | undefined;
  vectorLayer: VectorLayer<any> = new VectorLayer<any>();
  source = new VectorSource();
  showOsmData: boolean = false;
  hideImportedFeature: boolean = false;
  home: any;
  territoryNumber = new FormControl('');
  territoryName = new FormControl('');
  territoryCustomNumber = new FormControl('');
  territoryCustomName = new FormControl('');
  preacherName = new FormControl('');
  doNotVisitStreet = new FormControl('');
  doNotVisitHouseNumber = new FormControl('');
  doNotVisitDoorbell = new FormControl('');
  doNotVisitName = new FormControl('');
  addAsForeignLanguageTerritory = new FormControl(false);
  editingReturnDate: RegistryEntry | null = null;

  congregation: Congregation | undefined;
  territoriesSorted: Territory[] = [];
  territoriesNoContacts: Territory[] = [];
  territoriesOlder8Months: Territory[] = [];
  territoriesOlder4Months: Territory[] = [];
  territoriesAssigned: Territory[] = [];
  territoriesToBeAssigned: Territory[] = [];
  territoriesArchived: Territory[] = [];

  territoryNumbers: string [] = [];
  territoryNumberExist: boolean = false;
  territoryNames: Set<string> = new Set<string>();

  changesToBeSaved: number = 0;

  selectInteraction = new Select();
  dragAndDropInteraction: DragAndDrop | undefined;
  wktFormat = new WKT();
  modeSelected = '';
  lastSelectedFeature: Feature | undefined;
  lastSelectedTerritory: Territory | undefined;
  lastSavedTerritoryName: string = '';
  interaction: any = null;
  interactionType: string | undefined
  modifiedFeatures: boolean = false;
  appName = 'Final Approach Rust UI';
  version = '1.0.0';
  persona: string = localStorage.getItem('persona') || Personas.DESIGNER;
  defaultMapColor: string = '0,100,0';
  foreignMapColor: string = '183,0,255';
  tabTerritory: boolean = true;
  modalPreacherDetails: boolean = false;
  preacherList: Preacher[] = [];
  remoteOverviewId: string | null = null;
  remoteOverviewName: string | null = null;
  remoteTerritoryUuid: string | null = null;
  remoteTerritoryMap: TerritoryMap | null = null;
  isRemoteOverview: boolean = false;
  knownRemoteOverviewCount: number = 0;
  searchQuery: string = '';
  locationTracking: boolean = false;

  private geolocation: Geolocation | undefined;
  private locationLayer: VectorLayer | undefined;
  private positionFeature: Feature<Geometry> = new Feature<Geometry>();
  private accuracyFeature: Feature<Geometry> = new Feature<Geometry>();
  private locationCentered: boolean = false;

  isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1';

  constructor(
    private dialog: MatDialog,
    private mapService: MapService,
    private appService: AppService,
    private toastr: ToastrService,
    private apiService: ApiService,
    private remoteOverviewHistoryService: RemoteOverviewHistoryService
  ) {
  }

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
      layers: [this.vectorLayer],
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

      this.preacherName.setValue(undefined)

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
        this.vectorLayer.changed();
        return;
      }

      this.lastSelectedFeature = selectedFeatures[selectedFeatures.length - 1];

      if (!this.isLocalhost && this.isRemoteOverview) {
        this.navigateToRemoteTerritory(this.lastSelectedFeature);
        return;
      }

      this.lastSelectedTerritory = this.territoriesSorted.find(t => t.number === this.lastSelectedFeature.get('territoryNumber'))
      this.territoryCustomNumber.setValue(this.lastSelectedFeature.get('territoryNumber'));
      this.territoryCustomName.setValue(this.lastSelectedFeature.get('territoryName'));
      this.addAsForeignLanguageTerritory.setValue(this.lastSelectedFeature.get('foreignLanguageGroup'));
      this.vectorLayer.changed();
    });


    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'F5') {
        return;
      } else if (event.key === 'Escape') {
        this.removeInteraction();
        this.modeSelected = '';
        this.modalPreacherDetails = false;
        this.searchQuery = '';
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
        if (this.lastSelectedFeature) {
          this.openGoogleEarthForFeature(this.lastSelectedFeature)
        } else {
          this.openGoogleTab();
        }
      } else if (event.ctrlKey && event.key === 'k') {
        event.preventDefault();
        if (this.lastSelectedFeature) {
          this.downloadSelectedAsGoogleEarthKml()
        }
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
    const requestedId = urlParams.get('id');
    if (!this.isLocalhost) {
      this.persona = Personas.PREACHER
      this.remoteOverviewId = urlParams.get('overview');
      this.refreshKnownRemoteOverviewCount();

      const id = requestedId || this.remoteOverviewHistoryService.getLastVisited()?.id;

      if (id) {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const preacherNameHashPattern = /^-?\d+$/;

        if (uuidPattern.test(id)) {
          this.remoteTerritoryUuid = id;
          this.mapService.loadMapDesignById<TerritoryMap>(id).subscribe({
            next: mapDesign => {
              this.remoteTerritoryMap = mapDesign;
              this.loadTerritoryMap(mapDesign);
              this.zoomToExtendOfAllFeatures();
            },
            error: error => {
              console.error('Error loading remote territory map:', error);
              this.toastr.error('The requested territory map could not be loaded.');
            }
          });
        } else if (preacherNameHashPattern.test(id)) {
          this.remoteOverviewId = id;
          this.isRemoteOverview = true;

          this.mapService.loadMapDesignById<TerritoryOverview>(id).subscribe({
            next: overview => {
              this.remoteOverviewName = overview.preacherName;
              this.remoteOverviewHistoryService.remember(id, overview.preacherName);
              this.refreshKnownRemoteOverviewCount();
              overview.territoryList.forEach(mapDesign => this.loadTerritoryMap(mapDesign));
              this.zoomToExtendOfAllFeatures();
            },
            error: error => {
              console.error('Error loading remote territory overview:', error);
              this.toastr.error('The requested territory overview could not be loaded.');
            }
          });
        } else {
          this.toastr.error('The URL contains neither a valid territory UUID nor a preacher hash code.');
        }
      }
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

  ngOnDestroy(): void {
    this.geolocation?.setTracking(false);
  }

  protected showCurrentLocation(): void {
    if (this.locationTracking) {
      this.geolocation?.setTracking(false);
      this.locationTracking = false;
      this.locationCentered = false;
      this.positionFeature.setGeometry(undefined);
      this.accuracyFeature.setGeometry(undefined);
      this.zoomToExtendOfAllFeatures();
      return;
    }

    if (!navigator.geolocation) {
      this.toastr.error('GPS location is not supported by this browser.');
      return;
    }

    const currentPosition = this.geolocation?.getPosition();
    if (currentPosition) {
      this.centerMapOnLocation(currentPosition);
      return;
    }

    if (!this.map) {
      return;
    }

    if (this.geolocation) {
      this.locationTracking = true;
      this.geolocation.setTracking(true);
      return;
    }

    this.positionFeature.setStyle(new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({color: '#1976d2'}),
        stroke: new Stroke({color: '#ffffff', width: 3})
      })
    }));
    this.accuracyFeature.setStyle(new Style({
      fill: new Fill({color: 'rgba(25, 118, 210, 0.15)'}),
      stroke: new Stroke({color: 'rgba(25, 118, 210, 0.65)', width: 2})
    }));

    this.locationLayer = new VectorLayer({
      source: new VectorSource({
        features: [this.accuracyFeature, this.positionFeature]
      })
    });
    this.locationLayer.setZIndex(1000);
    this.map.addLayer(this.locationLayer);

    this.geolocation = new Geolocation({
      projection: this.view.getProjection(),
      trackingOptions: {
        enableHighAccuracy: true
      }
    });
    this.geolocation.on('change:accuracyGeometry', () => {
      this.accuracyFeature.setGeometry(this.geolocation?.getAccuracyGeometry());
    });
    this.geolocation.on('change:position', () => {
      const position = this.geolocation?.getPosition();
      this.positionFeature.setGeometry(position ? new Point(position) : undefined);

      if (position && !this.locationCentered) {
        this.centerMapOnLocation(position);
      }
    });
    this.geolocation.on('error', error => {
      this.locationTracking = false;
      this.toastr.error(`GPS location could not be determined: ${error.message}`);
    });

    this.locationTracking = true;
    this.geolocation.setTracking(true);
  }

  protected shareCurrentTerritory(): void {
    if (!this.remoteTerritoryUuid || !this.remoteTerritoryMap) {
      return;
    }

    if (!navigator.share) {
      this.toastr.error('Sharing is not supported by this browser.');
      return;
    }

    navigator.share({
      title: document.title,
      text: `Territory ${this.remoteTerritoryMap.territoryNumber}: ${this.remoteTerritoryMap.territoryName}`,
      url: window.location.href
    }).catch(error => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      console.error('Error sharing territory URL:', error);
      this.toastr.error('The territory link could not be shared.');
    });
  }

  private centerMapOnLocation(position: Coordinate): void {
    this.view.setCenter(position);
    if ((this.view.getZoom() ?? 0) < 17) {
      this.view.setZoom(17);
    }
    this.locationCentered = true;
  }

  public createStyle(fillColor: any = [0, 0, 0, 0.1], strokeColor: any = [255, 0, 0, 0.5], strokeWidth: number = 5, textFillColor: string = '#000', textStrokeColor: string = '#fff', textStrokeWidth: number = 3): Style {

    let font = '12px Calibri,sans-serif';

    if (!this.isLocalhost) {
      font = 'bolder 14px Calibri,sans-serif';
    }

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
        font: font,
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


  featureFunction(featureLike: FeatureLike): Style {

    if (!this.congregation) {
      // console.log('no congregation data')
      this.congregation = new Congregation();
      this.congregation.defaultFillColor = '#005793';
      this.congregation.defaultStrokeColor = '#ff0000';
      this.congregation.defaultTextFillColor = '#000000';
      this.congregation.defaultTextStrokeColor = '#ffffff';
      this.congregation.foreignFillColor = '#930091';
      this.congregation.foreignStrokeColor = '#ff0000';
      this.congregation.foreignTextFillColor = '#000000';
      this.congregation.foreignTextStrokeColor = '#ffffff';
    }

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
    let darkenColorFactor = 0.9;

    if (feature.get('selected')) {
      style = this.createStyle([0, 255, 0, 0.05], [255, 0, 0, 0.5], strokeWidth, '#001010', '#fff', 2);
    } else if (!this.showOsmData && feature.get('residentialUnit')) {
      style = new Style({});
    } else if (this.showOsmData && feature.get('residentialUnit')) {
      style = this.createStyle([0, 255, 0, 0.05], [0, 0, 255, 0.05], strokeWidth, '#00c4ff', '#fff', 2);
    } else if (feature.get('imported') && !this.hideImportedFeature) {
      style = this.createStyle([0, 0, 0, 0.05], [255, 0, 0, 0.25], strokeWidth, '#000', '#fff', 3);
    } else if (feature.get('imported') && this.hideImportedFeature) {
      style = new Style({});
    } else if (feature.get('territoryName') == 'DRAFT') {
      style = this.createStyle([255, 0, 0, 0.05], [155, 0, 0, 0.75], strokeWidth, '#700000', '#fff', 2);
    } else if (feature.get('draft') == false) {
      const isAssigned = this.isTerritoryAssigned(feature.get('territoryNumber'));
      if (feature.get('foreignLanguageGroup')) {
        let ffc = this.getColor(this.congregation.foreignFillColor)
        let fsc = this.getColor(this.congregation.foreignStrokeColor)
        if (isAssigned) {
          ffc = this.darkenColor(ffc, darkenColorFactor);
          fsc = this.darkenColor(fsc, darkenColorFactor);
        }
        style = this.createStyle([ffc[0], ffc[1], ffc[2], 0.1], [fsc[0], fsc[1], fsc[2], 0.5], strokeWidth, this.congregation.foreignTextFillColor, this.congregation.foreignTextStrokeColor, 2);
      } else {
        let ffc = this.getColor(this.congregation.defaultFillColor)
        let fsc = this.getColor(this.congregation.defaultStrokeColor)
        if (isAssigned) {
          ffc = this.darkenColor(ffc, darkenColorFactor);
          fsc = this.darkenColor(fsc, darkenColorFactor);
        }
        style = this.createStyle([ffc[0], ffc[1], ffc[2], 0.1], [fsc[0], fsc[1], fsc[2], 0.5], strokeWidth, this.congregation.defaultTextFillColor, this.congregation.defaultTextStrokeColor, 2);
      }
    }

    if (this.map.getView().getZoom() > 17) {
      style.getText().setText(feature.get('territoryNumber') + ' ' + feature.get('territoryName') + "\n" + feature.get('additionalNote'));
    } else if (this.map.getView().getZoom() > 16) {
      style.getText().setText(feature.get('territoryNumber') + ' ' + feature.get('territoryName'));
    } else if (this.map.getView().getZoom() > 15) {
      style.getText().setText(feature.get('territoryNumber'));
    } else {
      style.getText().setText('');
    }
    return style;
  }

  private isTerritoryAssigned(territoryNumber: string): boolean {
    if (!this.isLocalhost) {
      return false;
    }

    const territory = this.territoriesSorted.find(item => item.number === territoryNumber);
    return territory?.registryEntryList?.some(entry =>
      !entry.returnDate && entry.preacher.name !== 'CongregationPool'
    ) ?? false;
  }

  private darkenColor(color: number[], amount: number): number[] {
    const brightnessFactor = 1 - amount;
    return color.map(component => Math.round(component * brightnessFactor));
  }

  getColor(hexColor: string): number[] {
    if (!hexColor) {
      return [0, 0, 0, 0.1];
    }
    let color: number[] = [];
    const hex = hexColor.replace('#', '');

    color.push(parseInt(hex.substring(0, 2), 16));
    color.push(parseInt(hex.substring(2, 4), 16));
    color.push(parseInt(hex.substring(4, 6), 16));

    return color;
  }

  getRGBfromHex(hexColor: string): string {
    const hex = hexColor.replace('#', '');

    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    return `${r} ${g} ${b}`;
  }

  getRGBfillByType(): string {
    if (this.lastSelectedTerritory.foreignLanguageGroup) {
      return this.getRGBfromHex(this.congregation.foreignFillColor)
    }
    return this.getRGBfromHex(this.congregation.defaultFillColor)
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
    const dialogRef = this.dialog.open(PersonaComponent, {
      width: '1200px',
      minWidth: '500px',
      data: {
        appName: this.appName,
        version: this.version,
        home: this.home
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }

      this.persona = result.persona;
      console.log(result.persona);
    });
  }

  saveHome(): void {
    this.mapService.saveHome(this.map).subscribe(() => {
      this.mapService.loadHome().subscribe(home => {
        if (home && this.map) {
          this.home = home;
          this.toastr.success('Home view saved successfullyy: ' + JSON.stringify(home));

          if (this.congregation) {
            this.congregation.homeCoordinates = home.coordinates;
            this.congregation.homeZoom = home.zoom;
            this.mapService.saveCongregation(this.congregation).subscribe(() => {
            });
          }
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
      } else if (this.congregation && this.map) {
        this.map.getView().setCenter(this.congregation.homeCoordinates);
        this.map.getView().setZoom(this.congregation.homeZoom);
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

  private generateMapDesignFromFeature(feature: Feature<Geometry>) {
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
      url: '',
      foreignLanguageGroup: feature.get('foreignLanguageGroup'),
      businessSector: feature.get('businessSector'),
      industrySector: feature.get('industrySector'),
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
          this.territoryNumbers.push(mapDesign.territoryNumber);
          this.territoryNames.add(mapDesign.territoryName);
        });

      },
      error: (error) => {
        console.error('Error loading map design:', error);
      }
    });
  }

  /**
   * Zooms to the extend of remote loaded features.
   * Intended to use only remote, where no center information is available.
   * @private
   */
  private zoomToExtendOfAllFeatures(): void {
    if (!this.map) {
      return;
    }

    const extent = this.source.getExtent();

    if (isEmpty(extent)) {
      return;
    }

    this.map.getView().fit(extent, {
      padding: [40, 40, 40, 40],
      maxZoom: 18,
      duration: 300
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
        foreignLanguageGroup: mapDesign.foreignLanguageGroup,
        imported: false, // Set to true if the feature is imported
        businessSector: mapDesign.businessSector,
        industrySector: mapDesign.industrySector
      });
      feature.set('remoteTerritoryUuid', mapDesign.url);
      this.source.addFeature(feature);
    }
  }

  protected navigateBackToOverview(): void {
    if (!this.remoteOverviewId) {
      return;
    }

    const params = new URLSearchParams({id: this.remoteOverviewId});
    window.location.search = params.toString();
  }

  protected openRemoteOverviewHistory(): void {
    const dialogRef = this.dialog.open(RemoteOverviewHistoryDialogComponent, {
      width: '32rem',
      maxWidth: '90vw'
    });

    dialogRef.afterClosed().subscribe((entry: RemoteOverviewHistoryEntry | undefined) => {
      this.refreshKnownRemoteOverviewCount();

      if (entry) {
        this.navigateToRemoteOverview(entry.id);
      }
    });
  }

  private navigateToRemoteOverview(id: string): void {
    const params = new URLSearchParams({id: id});
    window.location.search = params.toString();
  }

  private refreshKnownRemoteOverviewCount(): void {
    this.knownRemoteOverviewCount = this.remoteOverviewHistoryService.getEntries().length;
  }

  private navigateToRemoteTerritory(feature: Feature): void {
    const territoryUuid = feature.get('remoteTerritoryUuid');
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!territoryUuid || !uuidPattern.test(territoryUuid)) {
      this.toastr.error('This territory has no valid remote UUID. Please synchronize the data again.');
      return;
    }

    const params = new URLSearchParams({
      id: territoryUuid,
      overview: this.remoteOverviewId!
    });
    window.location.search = params.toString();
  }

  protected saveMapForTerritory() {
    let mapDesign: TerritoryMap = this.generateMapDesignFromFeature(this.lastSelectedFeature);
    mapDesign.draft = false;
    mapDesign.territoryNumber = this.territoryCustomNumber.value;
    mapDesign.territoryName = this.territoryCustomName.value;
    mapDesign.foreignLanguageGroup = this.addAsForeignLanguageTerritory.value;
    // ensure that the feature is deleted from the backend, if it exists, and it will be replaced by the new one
    let deleteId = this.lastSelectedFeature.get('territoryNumber');
    this.mapService.deleteMapDesign(deleteId).subscribe(() => {
      this.mapService.saveMapDesign(mapDesign).subscribe(() => {
      })
    })
    // then a new real number is assigned to the feature
    this.lastSelectedFeature.set('territoryNumber', mapDesign.territoryNumber);
    this.lastSelectedFeature.set('territoryName', mapDesign.territoryName);
    this.lastSelectedFeature.set('additionalNote', mapDesign.additionalNote);
    this.lastSelectedFeature.set('foreignLanguageGroup', mapDesign.foreignLanguageGroup);
    this.lastSelectedFeature.set('businessSector', mapDesign.businessSector);
    this.lastSelectedFeature.set('industrySector', mapDesign.industrySector);
    this.lastSelectedFeature.set('draft', false);

    let territory = new Territory();
    territory.number = mapDesign.territoryNumber;
    territory.name = mapDesign.territoryName;
    territory.foreignLanguageGroup = mapDesign.foreignLanguageGroup;

    this.mapService.saveTerritory(territory).subscribe(() => {
      this.toastr.success('Territory saved successfully');
      if (!this.territoryNumbers.find(t => t == territory.number)) {
        this.territoryNumbers.push(territory.number);
      }
      this.territoryNames.add(territory.name);

      this.apiService.setCongregation(this.congregation);
      this.apiService.uploadTerritoryMap(mapDesign).subscribe({
        next: () => this.toastr.success('Territory map uploaded successfully'),
        error: error => {
          console.error('Error uploading territory map:', error);
          this.toastr.error('Territory was saved locally, but its map could not be uploaded');
        }
      });
    })

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

  reloadCongregationData(): void {

    this.mapService.loadCongregation().subscribe({
      "next": congregation => {
        this.congregation = congregation[0];
        this.apiService.setCongregation(this.congregation)

        // Sort preachers by name
        this.congregation.preacherList = this.congregation.preacherList.sort((a, b) => (a.name > b.name ? 1 : -1));

        if (!this.congregation) {
          console.log("No Congregation found. Creating a new one")
          this.congregation = new Congregation();
          this.congregation.defaultFillColor = "#00ff62";
          this.congregation.defaultStrokeColor = "#088000";
          this.congregation.defaultTextFillColor = "#194700";
          this.congregation.defaultTextStrokeColor = "#ffffff";
          this.congregation.foreignFillColor = "#4a70e3";
          this.congregation.foreignStrokeColor = "#424bcd";
          this.congregation.foreignTextFillColor = "#6c009e";
          this.congregation.foreignTextStrokeColor = "#ffffff";
          this.mapService.saveCongregation(this.congregation).subscribe(() => console.log("Congregation saved"))
        }
      },
      "error": (error) => {
        console.log(error)
        this.toastr.error('Error loading congregation:', error);
      }
    });

    this.source.getFeatures().forEach(feature => {
      this.featureFunction(feature);
    })
    this.vectorLayer = new VectorLayer({
      source: this.source,
      style: this.featureFunction.bind(this)
    });

    const now: Date = new Date();
    const eightMonthsAgo: Date = new Date(now.getFullYear(), now.getMonth() - 8, now.getDate());
    const fourMonthsAgo: Date = new Date(now.getFullYear(), now.getMonth() - 4, now.getDate());

    this.mapService.loadTerritories().subscribe(territories => {

      this.territoriesSorted = territories.sort((a, b) => (a.number > b.number ? 1 : -1));

      territories.forEach((t: Territory) => {

        if (!t.exported) {
          this.changesToBeSaved += 1;
        }

        if (t.registryEntryList.length == 0) {
          this.territoriesToBeAssigned.push(t);
        } else if (t.noContacts && !t.archive) {
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

      this.vectorLayer.changed();

      setTimeout(() => {
        territories.forEach((t: Territory) => {
          if (t.doNotVisitList && t.doNotVisitList.length > 0) {
            let feature = this.source.getFeatures().find(f => f.get('territoryNumber') == t.number);
            if (feature) {
              feature.set('additionalNote', `(${t.doNotVisitList.length} do not visit)`);
            }
          }
        })
      }, 500)
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

    return {title, image};
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
        {x: outerMargin, y: outerMargin},
        {x: outerMargin + cellWidth + gap, y: outerMargin},
        {x: outerMargin, y: outerMargin + cellHeight + gap},
        {x: outerMargin + cellWidth + gap, y: outerMargin + cellHeight + gap}
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
    this.vectorLayer.changed();
  }

  protected assignPreacher() {
    let preacher = this.congregation.preacherList.find(p => p.name == this.preacherName.value)
    if (!preacher) {
      preacher = new Preacher();
      preacher.name = this.preacherName.value;
      this.congregation.preacherList.push(preacher);
      this.congregation.preacherList = this.congregation.preacherList.sort((a, b) => (a.name > b.name ? 1 : -1));
      this.mapService.saveCongregation(this.congregation).subscribe(() => {
      })
      this.preacherName.setValue(undefined);
    }
    let territory = this.territoriesSorted.find(t => t.number == this.lastSelectedFeature.get('territoryNumber'));
    if (territory) {
      let registry = new RegistryEntry();
      registry.preacher = preacher;
      registry.returnDate = undefined;

      const openEntry = territory.registryEntryList.find(e => !e.returnDate);

      if (openEntry) {
        openEntry.returnDate = new Date();
      }

      territory.registryEntryList.unshift(registry);
      if (territory.registryEntryList.length > 20) {
        territory.registryEntryList.pop();
      }
      this.lastSelectedTerritory = territory;
      this.mapService.saveTerritory(territory).subscribe(() => {
        this.vectorLayer.changed();
      });
    }
  }

  protected register() {

    let territory = this.territoriesSorted.find(t => t.number == this.lastSelectedFeature.get('territoryNumber'));
    if (territory) {
      let lastEntry = territory.registryEntryList[0];
      let registry = new RegistryEntry();
      registry.preacher = lastEntry.preacher;
      registry.returnDate = undefined;
      registry.registration = true;

      const openEntry = territory.registryEntryList.find(e => !e.returnDate);

      if (openEntry) {
        openEntry.returnDate = new Date();
      }

      territory.registryEntryList.unshift(registry);
      if (territory.registryEntryList.length > 20) {
        territory.registryEntryList.pop();
      }
      this.lastSelectedTerritory = territory;
      this.mapService.saveTerritory(territory).subscribe(() => {
      });
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
      console.log(this.congregation);
    });
  }

  protected deleteRegistry(r: RegistryEntry) {
    this.lastSelectedTerritory.registryEntryList =
      this.lastSelectedTerritory.registryEntryList.filter(entry => {
        const sameDate = entry.assignDate === r.assignDate;
        const samePreacher = entry.preacher.name === r.preacher.name;

        return !(sameDate && samePreacher);
      });

    this.mapService.saveTerritory(this.lastSelectedTerritory).subscribe(() => {
    });
  }

  protected getForeignStyleColour() {
    if (this.addAsForeignLanguageTerritory.value) {
      return "background-color: rgba(183 0 255 / 0.66)!important;"
    }
    return "background-color: rgba(0,128,255,0.66)!important;"
  }

  openGoogleEarthForFeature(feature: Feature) {
    const geometry = feature.getGeometry();
    const extent = geometry.getExtent();
    const center = getCenter(extent);
    const [lon, lat] = transform(center, 'EPSG:3857', 'EPSG:4326');

    const url = `https://earth.google.com/web/@${lat},${lon},1000a,0d,35y,0h,0t,0r`;
    window.open(url, '_blank');
  }

  downloadSelectedAsGoogleEarthKml() {
    let features = this.selectInteraction.getFeatures().getArray();

    if (!features || features.length === 0) {
      features = this.vectorLayer.getSource().getFeatures();
    }

    const kml = this.createGoogleEarthKml(features, 'Gebiete');

    const blob = new Blob([kml], {
      type: 'application/vnd.google-earth.kml+xml;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'gebiete.kml';
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private createGoogleEarthKml(features: Feature[], documentName: string): string {
    const placemarks = features
      .map((feature, index) => this.featureToKmlPlacemark(feature, index))
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>${this.escapeXml(documentName)}</name>

  ${placemarks}

</Document>
</kml>`;
  }

  private featureToKmlPlacemark(feature: Feature, index: number): string {
    const geometry = feature.getGeometry();

    if (!geometry) {
      return '';
    }

    const name =
      feature.get('name') ||
      feature.get('territoryName') ||
      feature.get('territoryNumber') ||
      `Gebiet ${index + 1}`;

    const style = this.getFeatureKmlStyle(feature);

    const styleId = `style-${index}`;

    let geometryKml = '';

    if (geometry instanceof Polygon) {
      geometryKml = this.polygonToKml(geometry);
    } else if (geometry instanceof MultiPolygon) {
      geometryKml = this.multiPolygonToKml(geometry);
    } else {
      return '';
    }

    return `
<Style id="${styleId}">
  <LineStyle>
    <color>${style.strokeColor}</color>
    <width>${style.strokeWidth}</width>
  </LineStyle>
  <PolyStyle>
    <color>${style.fillColor}</color>
    <fill>1</fill>
    <outline>1</outline>
  </PolyStyle>
</Style>

<Placemark>
  <name>${this.escapeXml(String(name))}</name>
  <styleUrl>#${styleId}</styleUrl>
  ${geometryKml}
</Placemark>`;
  }

  private getFeatureKmlStyle(feature: Feature): {
    strokeColor: string;
    fillColor: string;
    strokeWidth: number;
  } {
    let strokeCss = '#ff0000';
    let fillCss = 'rgba(255, 0, 0, 0.18)';
    let strokeWidth = 4;

    const featureStyle = feature.getStyle();

    if (featureStyle instanceof Style) {
      const stroke = featureStyle.getStroke();
      const fill = featureStyle.getFill();

      if (stroke) {
        strokeCss = String(stroke.getColor() || strokeCss);
        strokeWidth = stroke.getWidth() || strokeWidth;
      }

      if (fill) {
        fillCss = String(fill.getColor() || fillCss);
      }
    }

    return {
      strokeColor: this.cssColorToKmlColor(strokeCss, 1.0),
      fillColor: this.cssColorToKmlColor(fillCss, 0.18),
      strokeWidth
    };
  }

  private cssColorToKmlColor(color: string, fallbackAlpha: number): string {
    let r = 255;
    let g = 0;
    let b = 0;
    let a = fallbackAlpha;

    if (color.startsWith('#')) {
      const hex = color.replace('#', '');

      if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }

      if (hex.length === 8) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
        a = parseInt(hex.substring(6, 8), 16) / 255;
      }
    }

    const rgbaMatch = color.match(
      /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/
    );

    if (rgbaMatch) {
      r = parseInt(rgbaMatch[1], 10);
      g = parseInt(rgbaMatch[2], 10);
      b = parseInt(rgbaMatch[3], 10);

      if (rgbaMatch[4] !== undefined) {
        a = parseFloat(rgbaMatch[4]);
      }
    }

    const aa = this.toHexByte(Math.round(a * 255));
    const bb = this.toHexByte(b);
    const gg = this.toHexByte(g);
    const rr = this.toHexByte(r);

    return `${aa}${bb}${gg}${rr}`;
  }

  private toHexByte(value: number): string {
    const clamped = Math.max(0, Math.min(255, value));
    return clamped.toString(16).padStart(2, '0');
  }

  private polygonToKml(polygon: Polygon): string {
    const rings = polygon.getCoordinates();

    const outerRing = rings[0];
    const innerRings = rings.slice(1);

    return `
<Polygon>
  <tessellate>1</tessellate>
  <altitudeMode>clampToGround</altitudeMode>
  <outerBoundaryIs>
    <LinearRing>
      <coordinates>
        ${this.coordinatesToKml(outerRing)}
      </coordinates>
    </LinearRing>
  </outerBoundaryIs>
  ${innerRings.map(ring => `
  <innerBoundaryIs>
    <LinearRing>
      <coordinates>
        ${this.coordinatesToKml(ring)}
      </coordinates>
    </LinearRing>
  </innerBoundaryIs>`).join('\n')}
</Polygon>`;
  }

  private multiPolygonToKml(multiPolygon: MultiPolygon): string {
    const polygons = multiPolygon.getPolygons();

    return `
<MultiGeometry>
  ${polygons.map(polygon => this.polygonToKml(polygon)).join('\n')}
</MultiGeometry>`;
  }

  private coordinatesToKml(coordinates: number[][]): string {
    return coordinates
      .map(coord => {
        const [lon, lat] = transform(coord, 'EPSG:3857', 'EPSG:4326');
        return `${lon},${lat},0`;
      })
      .join(' ');
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  protected toDateInputValue(date: Date | string | undefined | null): string {
    if (!date) {
      return '';
    }

    const d = new Date(date);

    if (isNaN(d.getTime())) {
      return '';
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  protected fromDateInputValue(value: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    return new Date(value + 'T00:00:00');
  }

  protected saveRegistryChange() {
    this.mapService.saveTerritory(this.lastSelectedTerritory).subscribe(() => {
    });
  }


  protected addDoNotVisitEntry() {
    let doNotVisitEntry = new DoNotVisit()
    doNotVisitEntry.street = this.doNotVisitStreet.value;
    doNotVisitEntry.houseNumber = this.doNotVisitHouseNumber.value;
    doNotVisitEntry.doorbell = this.doNotVisitDoorbell.value;
    doNotVisitEntry.name = this.doNotVisitName.value;
    doNotVisitEntry.date = new Date();
    if (!this.lastSelectedTerritory.doNotVisitList) {
      this.lastSelectedTerritory.doNotVisitList = [];
    }
    this.lastSelectedTerritory.doNotVisitList.push(doNotVisitEntry);
    this.lastSelectedFeature.set('additionalNote', `(${this.lastSelectedTerritory.doNotVisitList.length} do not visit)`);
    this.mapService.saveTerritory(this.lastSelectedTerritory).subscribe(() => {
    });
    this.mapService.saveTerritory(this.lastSelectedTerritory).subscribe(() => {
    });
  }

  protected deleteDoNotVisit(d: DoNotVisit) {
    this.lastSelectedTerritory.doNotVisitList.splice(this.lastSelectedTerritory.doNotVisitList.indexOf(d), 1);
    this.lastSelectedFeature.set('additionalNote', `(${this.lastSelectedTerritory.doNotVisitList.length} do not visit)`);
    if (this.lastSelectedTerritory.doNotVisitList.length === 0) {
      this.lastSelectedFeature.set('additionalNote', '');
    }
    this.mapService.saveTerritory(this.lastSelectedTerritory).subscribe(() => {
    })
  }

  protected checkIfTerritoryNumberExist() {
    if (this.territoryNumbers.find(t => t == this.territoryCustomNumber.value)) {
      this.territoryNumberExist = true;
    } else {
      this.territoryNumberExist = false;
    }
  }

  protected toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  protected deletePreacher(p: Preacher) {
    this.toastr.warning('Preacher will be deleted from all territories ... to be implemented');
  }

  protected openPreacherDetails(foreignGroup: boolean) {

    if (!this.modalPreacherDetails) {
      this.modalPreacherDetails = true
    }

    this.preacherList = []
    this.congregation.preacherList.forEach(p => {
      if ((foreignGroup == false && p.foreignLanguageGroup == undefined) || (p.foreignLanguageGroup == foreignGroup)) {
        this.preacherList.push(p);
      }
    })
  }

  protected getAssignedTerritories(preacher: Preacher): PreacherTerritoryAssignment[] {
    return this.territoriesSorted.flatMap(territory => {
      const activeAssignment = territory.registryEntryList?.find(entry =>
        !entry.returnDate && entry.preacher.name === preacher.name
      );

      if (!activeAssignment) {
        return [];
      }

      const activeAssignmentIndex = territory.registryEntryList.indexOf(activeAssignment);
      const originalAssignment = activeAssignment.registration
        ? territory.registryEntryList
          .slice(activeAssignmentIndex + 1)
          .find(entry => !entry.registration && entry.preacher.name === preacher.name)
        : activeAssignment;

      return [{
        territoryNumber: territory.number,
        territoryName: territory.name,
        assignedAt: originalAssignment?.assignDate ?? activeAssignment.assignDate
      }];
    });
  }

  protected openPreacherTerritories(preacher: Preacher): void {
    const dialogRef = this.dialog.open(PreacherTerritoriesDialogComponent, {
      width: '40rem',
      maxWidth: '90vw',
      data: {
        preacherName: preacher.name,
        assignments: this.getAssignedTerritories(preacher),
        territories: this.territoriesSorted,
        territoryChanged: () => this.vectorLayer.changed()
      }
    });

    dialogRef.afterClosed().subscribe((territoryNumber: string | undefined) => {
      if (territoryNumber && this.selectTerritoryByNumber(territoryNumber)) {
        this.register();
      }
    });
  }

  protected switchGroup(p: Preacher) {

    this.preacherList.splice(this.preacherList.indexOf(p), 1);

    if (p.foreignLanguageGroup == undefined) {
      p.foreignLanguageGroup = false;
    }

    p.foreignLanguageGroup = !p.foreignLanguageGroup;

    this.congregation.preacherList.forEach(p2 => {
      if (p2.name == p.name) {
        console.log(p.foreignLanguageGroup)
        p2.foreignLanguageGroup = p.foreignLanguageGroup;
      }
    })
    this.mapService.saveCongregation(this.congregation).subscribe(() => {
      this.toastr.success(`${p.name} is now ${p.foreignLanguageGroup ? 'in' : 'out'} foreign language group`);
    })
  }

  protected synchronize() {
    const uuidFilePattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.json$/i;

    this.mapService.loadCongregation().subscribe({
      next: congregations => {
        const congregation = congregations[0];

        if (!congregation) {
          this.toastr.error('Synchronization failed because no local congregation exists.');
          return;
        }

        this.apiService.setCongregation(congregation);

        this.mapService.loadTerritories().subscribe({
          next: territories => {
            this.mapService.loadMapDesign().subscribe({
              next: territoryMaps => {
                this.apiService.loadJsonFileNames().subscribe({
                  next: fileNames => {
                    const remoteUuids = new Set(
                      fileNames
                        .map(fileName => fileName.match(uuidFilePattern)?.[1]?.toLowerCase())
                        .filter((uuid): uuid is string => Boolean(uuid))
                    );

                    territories.forEach(territory => {
                      if (!territory.uuid) {
                        territory.uuid = crypto.randomUUID();
                      }
                    });

                    const localUuids = new Set(
                      territories.map(territory => territory.uuid!.toLowerCase())
                    );
                    const obsoleteUuids = fileNames
                      .map(fileName => fileName.match(uuidFilePattern)?.[1])
                      .filter((uuid): uuid is string => Boolean(uuid))
                      .filter(uuid => !localUuids.has(uuid.toLowerCase()));
                    const territoryMapByNumber = new globalThis.Map(
                      territoryMaps.map(map => [map.territoryNumber, map])
                    );
                    const territoriesToUpload = territories.filter(territory => {
                      const isInCongregationPool = territory.registryEntryList?.some(entry =>
                        !entry.returnDate && entry.preacher.name === 'CongregationPool'
                      );

                      return !isInCongregationPool &&
                        (!territory.exported || !remoteUuids.has(territory.uuid!.toLowerCase()));
                    });
                    const missingMapDesigns = territoriesToUpload.filter(territory =>
                      !territoryMapByNumber.has(territory.number)
                    );
                    const territoryUploads = territoriesToUpload
                      .filter(territory => territoryMapByNumber.has(territory.number))
                      .map(territory => this.apiService
                        .uploadJson(territory.uuid!, territoryMapByNumber.get(territory.number)!)
                        .pipe(
                          tap(() => {
                            territory.mapExist = true;
                            territory.exported = true;
                          }),
                          concatMap(() => this.mapService.saveTerritory(territory))
                        ));
                    const updatedAt = new Date();
                    const territoryOverviews = congregation.preacherList.map(preacher => {
                      const assignedTerritoryNumbers = new Set(
                        territories
                          .filter(territory =>
                            territory.registryEntryList?.some(entry =>
                              !entry.returnDate && entry.preacher.name === preacher.name
                            )
                          )
                          .map(territory => territory.number)
                      );
                      const overview = new TerritoryOverview();
                      overview.preacherName = preacher.name;
                      overview.territoryList = territoryMaps
                        .filter(map => assignedTerritoryNumbers.has(map.territoryNumber))
                        .map(map => {
                          const territory = territories.find(item => item.number === map.territoryNumber);

                          return {
                            ...map,
                            url: territory?.uuid ?? ''
                          };
                        });
                      overview.updatedAt = updatedAt;

                      return {
                        fileName: this.createPreacherNameHashCode(preacher.name),
                        overview
                      };
                    });
                    const synchronizationRequests = [
                      ...obsoleteUuids.map(uuid => this.apiService.deleteJsonFile(uuid)),
                      ...territoryUploads,
                      ...territoryOverviews.map(item => this.apiService.uploadJson(item.fileName, item.overview))
                    ];

                    from(synchronizationRequests).pipe(
                      concatMap(request => request),
                      toArray()
                    ).subscribe({
                      next: () => {
                        this.changesToBeSaved = missingMapDesigns.length;
                        this.territoriesSorted.forEach(displayedTerritory => {
                          const synchronizedTerritory = territories.find(territory =>
                            territory.number === displayedTerritory.number
                          );

                          if (synchronizedTerritory) {
                            displayedTerritory.uuid = synchronizedTerritory.uuid;
                            displayedTerritory.mapExist = synchronizedTerritory.mapExist;
                            displayedTerritory.exported = synchronizedTerritory.exported;
                          }
                        });

                        this.toastr.success(
                          `Synchronization complete. ${obsoleteUuids.length} remote territory file(s) deleted and ` +
                          `${territoryUploads.length} territory map(s) and ` +
                          `${territoryOverviews.length} preacher overview(s) uploaded.`
                        );

                        if (missingMapDesigns.length > 0) {
                          const territoryNumbers = missingMapDesigns.map(territory => territory.number).join(', ');
                          this.toastr.warning(`No map design exists for territory: ${territoryNumbers}`);
                        }
                      },
                      error: error => {
                        console.error('Error synchronizing remote data:', error);
                        this.toastr.error('Synchronization failed while updating remote data.');
                      }
                    });
                  },
                  error: error => {
                    console.error('Error loading remote territory files:', error);
                    this.toastr.error('Synchronization failed while loading remote files.');
                  }
                });
              },
              error: error => {
                console.error('Error loading local territory maps:', error);
                this.toastr.error('Synchronization failed while loading local territory maps.');
              }
            });
          },
          error: error => {
            console.error('Error loading local territories:', error);
            this.toastr.error('Synchronization failed while loading local territories.');
          }
        });
      },
      error: error => {
        console.error('Error loading local congregation:', error);
        this.toastr.error('Synchronization failed while loading the local congregation.');
      }
    });
  }

  private createPreacherNameHashCode(preacherName: string): string {
    let hashCode = 0;

    for (let index = 0; index < preacherName.length; index++) {
      hashCode = (Math.imul(31, hashCode) + preacherName.charCodeAt(index)) | 0;
    }

    return hashCode.toString();
  }

  protected copyRemoteTerritoryOverviewLink(preacher: Preacher): void {
    if (!this.congregation?.rootURL || !preacher.name) {
      this.toastr.error('The remote URL or preacher name is missing.');
      return;
    }

    let remoteUrl: URL;

    try {
      remoteUrl = new URL(this.congregation.rootURL, window.location.origin);
      remoteUrl.searchParams.set('id', this.createPreacherNameHashCode(preacher.name));
    } catch (error) {
      console.error('Error creating remote territory overview URL:', error);
      this.toastr.error('The configured remote URL is invalid.');
      return;
    }

    if (!navigator.clipboard) {
      this.toastr.error('Clipboard access is not supported by this browser.');
      return;
    }

    navigator.clipboard.writeText(remoteUrl.toString()).then(() => {
      this.toastr.success('Remote territory overview URL copied to clipboard.');
    }).catch(error => {
      console.error('Error copying remote territory overview URL:', error);
      this.toastr.error('The remote territory overview URL could not be copied.');
    });
  }

  protected get searchResults(): SearchResult[] {
    const query = this.searchQuery.trim().toLocaleLowerCase();

    if (query.length < 2) {
      return [];
    }

    const territoryResults = this.territoriesSorted
      .filter(territory =>
        territory.number.toLocaleLowerCase().includes(query)
        || territory.name.toLocaleLowerCase().includes(query)
      )
      .map(territory => ({
        label: territory.number,
        details: territory.name,
        territoryNumber: territory.number,
        type: 'Territory' as const
      }));
    const preacherResults = (this.congregation?.preacherList ?? [])
      .filter(preacher => preacher.name.toLocaleLowerCase().includes(query))
      .map(preacher => ({
        label: preacher.name,
        details: '',
        preacherName: preacher.name,
        type: 'Preacher' as const
      }));

    return [...preacherResults, ...territoryResults];
  }

  protected selectTerritorySearchResult(result: SearchResult): void {
    if (result.type !== 'Territory' || !result.territoryNumber || !this.map) {
      return;
    }

    this.selectTerritoryByNumber(result.territoryNumber);
  }

  protected selectPreacherSearchResult(result: SearchResult): void {
    if (result.type !== 'Preacher' || !result.preacherName) {
      return;
    }

    const preacher = this.congregation?.preacherList.find(item => item.name === result.preacherName);

    if (!preacher) {
      this.toastr.error('The selected preacher could not be found.');
      return;
    }

    this.searchQuery = '';
    this.openPreacherTerritories(preacher);
  }

  private selectTerritoryByNumber(territoryNumber: string): boolean {
    if (!this.map) {
      return false;
    }

    const territory = this.territoriesSorted.find(item => item.number === territoryNumber);
    const feature = this.source.getFeatures().find(item =>
      item.get('territoryNumber') === territoryNumber
    );
    const geometry = feature?.getGeometry();

    if (!territory || !feature || !geometry) {
      this.toastr.error('The selected territory has no map feature.');
      return false;
    }

    this.clearSelectedFeatures();
    this.selectInteraction.getFeatures().push(feature);
    feature.set('selected', true);
    feature.setStyle(undefined);

    this.lastSelectedFeature = feature;
    this.lastSelectedTerritory = territory;
    this.territoryCustomNumber.setValue(feature.get('territoryNumber'));
    this.territoryCustomName.setValue(feature.get('territoryName'));
    this.addAsForeignLanguageTerritory.setValue(feature.get('foreignLanguageGroup'));
    this.searchQuery = '';
    this.vectorLayer.changed();

    this.map.getView().fit(geometry.getExtent(), {
      padding: [30, 30, 30, 30],
      maxZoom: 21,
      duration: 500
    });

    return true;
  }

  /**
   * Shows a dialog to select a territory from the list of territories sorted by its last registry entry date (except registered = true)
   * @param foreignGroup
   * @protected
   */
  protected openTerritoryDetails(foreignGroup: boolean): void {
    const territories = this.territoriesSorted
      .filter(territory => Boolean(territory.foreignLanguageGroup) === foreignGroup)
      .map(territory => {
        const lastRegistryEntry = territory.registryEntryList
          ?.filter(entry => !entry.registration)
          .sort((first, second) =>
            new Date(second.assignDate).getTime() - new Date(first.assignDate).getTime()
          )[0];

        return {
          territoryNumber: territory.number,
          territoryName: territory.name,
          lastAssignedAt: lastRegistryEntry ? new Date(lastRegistryEntry.assignDate) : null,
          lastPreacherName: lastRegistryEntry?.preacher.name ?? null
        } satisfies TerritoryDetailsItem;
      })
      .sort((first, second) => {
        if (!first.lastAssignedAt && !second.lastAssignedAt) {
          return first.territoryNumber.localeCompare(second.territoryNumber, undefined, {numeric: true});
        }
        if (!first.lastAssignedAt) {
          return -1;
        }
        if (!second.lastAssignedAt) {
          return 1;
        }

        return first.lastAssignedAt.getTime() - second.lastAssignedAt.getTime();
      });

    const dialogRef = this.dialog.open(TerritoryDetailsDialogComponent, {
      width: '48rem',
      maxWidth: '90vw',
      data: {
        title: foreignGroup
          ? `${this.congregation?.foreignLanguageGroupName || 'Foreign language group'} territories`
          : `${this.congregation?.name || 'Congregation'} territories`,
        territories
      }
    });

    dialogRef.afterClosed().subscribe((territoryNumber: string | undefined) => {
      if (territoryNumber) {
        this.selectTerritoryByNumber(territoryNumber);
      }
    });
  }

  /**
   * Add a new registry entry of the selected territory with a virtual preacher named "CongregationPool"
   * @protected
   */
  protected backToPool(): void {
    if (!this.lastSelectedTerritory) {
      return;
    }

    const territory = this.lastSelectedTerritory;
    const openEntry = territory.registryEntryList.find(entry => !entry.returnDate);

    if (openEntry?.preacher.name === 'CongregationPool') {
      return;
    }

    if (openEntry) {
      openEntry.returnDate = new Date();
    }

    const congregationPool = new Preacher();
    congregationPool.name = 'CongregationPool';

    const registryEntry = new RegistryEntry();
    registryEntry.territoryNumber = territory.number;
    registryEntry.territoryName = territory.name;
    registryEntry.preacher = congregationPool;
    registryEntry.returnDate = null;

    territory.registryEntryList.unshift(registryEntry);
    territory.uuid = crypto.randomUUID();
    if (territory.registryEntryList.length > 20) {
      territory.registryEntryList.pop();
    }

    this.mapService.saveTerritory(territory).subscribe(() => {
      this.vectorLayer.changed();
    });

  }
}
