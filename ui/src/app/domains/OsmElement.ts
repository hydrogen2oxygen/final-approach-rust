export class OsmElement {
  type:string|undefined;
  id:string|undefined;
  lat:number|undefined;
  lon:number|undefined;
  role:string|undefined;
  tags:Map<string, string>|undefined;
}
