import {ResidentialUnit} from "./ResidentialUnit";

export class MapDesign {
  coordinatesX:number = -472202;
  coordinatesY:number = 7530279;
  zoom:number = 12;
  territoryMapList:TerritoryMap[] = [];
}

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
