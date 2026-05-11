import {ResidentialUnit} from "./ResidentialUnit";

export class OsmStreet {
  coordinates:any[] = [];
  houseNumbers:string[] = [];
  streetName:string = '';
}

export class TerritoryMap {
  draft:boolean=true;
  territoryNumber:string='';
  territoryName:string='';
  formerTerritoryNumber:string | null = null;
  simpleFeatureData:string='';
  simpleFeatureType:string='';
  note:string='';
  lastUpdate:Date=new Date();
  streetList:OsmStreet[] = [];
  residentialUnits:ResidentialUnit[] = [];
  url:string='';
}

export enum Personas {
  MANAGER = 'MANAGER',
  PREACHER = 'PREACHER',
  DESIGNER = 'DESIGNER',
  GROUP_LEADER = 'GROUP_LEADER'
}
