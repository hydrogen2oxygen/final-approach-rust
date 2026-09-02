import {FormControl} from '@angular/forms';
import {ForeignLanguageCoverage, TerritoryMap} from './MapDesign';

export class Congregation {
  name:string = '';
  lastUpdate:Date = new Date();
  notes: string | null | undefined;
  simpleFeatureData: string | null | undefined;
  preacherList:Preacher[] = [];
  counterUploadFailed:number = 0;
  protocol:string[] = [];
  includeForeignLanguageGroup:boolean = false;
  foreignLanguageGroupName:string = "";
  homeCoordinates:any;
  homeZoom:any;
  defaultFillColor:string = "";
  defaultStrokeColor:string = "";
  defaultTextFillColor:string = "";
  defaultTextStrokeColor:string = "";
  foreignFillColor:string = "";
  foreignStrokeColor:string = "";
  foreignTextFillColor:string = "";
  foreignTextStrokeColor:string = "";
  apiUUID: string = "";
  apiSECRET: string = "";
  rootURL: string = "";
  territoryOverviewPassword: string = "";
}

export class ColorSettings {
  defaultFillColor:string = "";
  defaultStrokeColor:string = "";
  defaultTextFillColor:string = "";
  defaultTextStrokeColor:string = "";
  foreignFillColor:string = "";
  foreignStrokeColor:string = "";
  foreignTextFillColor:string = "";
  foreignTextStrokeColor:string = "";
}

export class Preacher {
  name:string = '';
  shortName:string | undefined;
  uuid:string = '';
  territoryListNumbers:string[] = [];
  group:string[] = [];
  softdelete:boolean = false;
  harddelete:boolean = false;
  showPreacherActions:boolean = false;
  css:string = ""
  foreignLanguageGroup:boolean=false;
}

export class Territory {
  number: string = '';
  name:string = '';
  date:Date = new Date();
  registryEntryList:RegistryEntry[] = [];
  notes:string[]=[];
  doNotVisitList:DoNotVisit[]=[];
  noContacts:boolean=false; // a territory with currently no contacts to visit
  archive:boolean=false;
  url:string | null='';
  uuid:string|undefined;
  newPreacherAssigned:boolean=false;
  exported:boolean=false;
  mapExist:boolean=false;
  foreignLanguageGroup:boolean=false;
  foreignLanguageCoverage:ForeignLanguageCoverage=null;
}

/**
 * A preacher has multiple territories, but only one overview.
 * The overview is a container for the territory list.
 * It will be uploaded to the server, using the hashcode of the preacher's name.
 */
export class TerritoryOverview {
  preacherName:string = '';
  territoryList:TerritoryMap[] = [];
  updatedAt:Date = new Date();
}

export class DoNotVisit {
  street:string = '';
  houseNumber:string = '';
  doorbell:string = ''; // the position of the doorbell, avoiding mentioning the name itself
  name:string = ''; // the name of the person who should not be visited (then this will be cut out of the information, especially if too long ... "Thomas Maier" becomes "T. M.")
  date:Date = new Date();
}

export class RegistryEntry {
  territoryNumber:string = '';
  territoryName:string = '';
  preacher:Preacher = new Preacher();
  assignDate:Date = new Date();
  returnDate:Date | null = new Date();
  registration:boolean = false;
}

export class Version {
  revision:string = '';
  counterTerritories:number = 0;
  counterPreachers:number = 0;
  counterPreacherWithTerritories:number = 0;
  uploading:boolean = false;
  downloading:boolean = false;
}
