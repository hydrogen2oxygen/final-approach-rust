import {ResidentialUnit} from "./ResidentialUnit";

export type ForeignLanguageCoverage = 0 | 25 | 50 | 100 | null;

export class OsmStreet {
  coordinates:any[] = [];
  houseNumbers:string[] = [];
  streetName:string = '';
}

export class TerritoryMap {
  draft:boolean=true;
  territoryNumber:string='';
  territoryName:string='';
  additionalNote:string='';
  formerTerritoryNumber:string | null = null;
  simpleFeatureData:string='';
  simpleFeatureType:string='';
  note:string='';
  lastUpdate:Date=new Date();
  streetList:OsmStreet[] = [];
  residentialUnits:ResidentialUnit[] = [];
  url:string='';
  foreignLanguageGroup:boolean=false;
  foreignLanguageCoverage:ForeignLanguageCoverage=null;
  hasDoNotVisitEntries:boolean=false;
  businessSector:boolean=false;
  industrySector:boolean=false;
}

export enum Personas {
  MANAGER = 'MANAGER',
  PREACHER = 'PREACHER',
  DESIGNER = 'DESIGNER',
  GROUP_LEADER = 'GROUP_LEADER'
}
