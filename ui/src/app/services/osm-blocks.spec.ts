import {buildOsmBlocks, OsmWay} from './osm-blocks';
import {fromLonLat, transformExtent} from 'ol/proj';

describe('OSM street blocks', () => {
  const extent = transformExtent([-0.01, -0.01, 0.02, 0.02], 'EPSG:4326', 'EPSG:3857');
  const points: Record<number, [number, number]> = {
    1: [0, 0], 2: [0.001, 0], 3: [0.002, 0],
    4: [0, 0.001], 5: [0.001, 0.001], 6: [0.002, 0.001],
    7: [0.0005, 0.0005], 8: [0.001, 0.0005]
  };
  const road = (nodes: number[], tags: Record<string, string> = {}): OsmWay => ({
    type: 'way', id: nodes[0], nodes, tags: {highway: 'residential', ...tags},
    geometry: nodes.map(id => ({lon: points[id][0], lat: points[id][1]}))
  });
  const building = (lon: number, lat = 0.0004): OsmWay => ({
    type: 'way', id: 100, tags: {building: 'yes'},
    geometry: [[lon, lat], [lon + 0.0001, lat], [lon + 0.0001, lat + 0.0001],
      [lon, lat + 0.0001], [lon, lat]].map(([x, y]) => ({lon: x, lat: y}))
  });
  const perimeter = road([1, 2, 3, 6, 5, 4, 1]);

  it('finds adjacent building blocks without emitting the exterior face', () => {
    const result = buildOsmBlocks({elements: [perimeter, road([2, 5]), building(0.0002), building(0.0012)]}, extent);
    expect(result.length).toBe(2);
    expect(result.every(polygon => polygon.getCoordinates()[0].length === 5)).toBeTrue();
  });

  it('ignores dead ends and duplicate ways', () => {
    const result = buildOsmBlocks({elements: [perimeter, perimeter, road([4, 7]), building(0.0002)]}, extent);
    expect(result.length).toBe(1);
    expect(result[0].getCoordinates()[0].length).toBe(7);
  });

  it('does not split blocks at service roads or grade-separated streets', () => {
    for (const tags of [{highway: 'service'}, {bridge: 'yes'}, {tunnel: 'yes'}, {layer: '1'}]) {
      expect(buildOsmBlocks({elements: [perimeter, road([2, 5], tags), building(0.0002)]}, extent).length).toBe(1);
    }
  });

  it('omits empty and partially selected blocks instead of closing along the rectangle', () => {
    expect(buildOsmBlocks({elements: [perimeter]}, extent)).toEqual([]);
    const partial = transformExtent([0, 0, 0.0015, 0.002], 'EPSG:4326', 'EPSG:3857');
    expect(buildOsmBlocks({elements: [perimeter, building(0.0002)]}, partial)).toEqual([]);
  });

  it('uses holes for disconnected nested street rings', () => {
    const inner: OsmWay = {
      type: 'way', id: 200, nodes: [11, 12, 13, 14, 11], tags: {highway: 'residential'},
      geometry: [[0.0005, 0.0002], [0.0015, 0.0002], [0.0015, 0.0008],
        [0.0005, 0.0008], [0.0005, 0.0002]].map(([lon, lat]) => ({lon, lat}))
    };
    const result = buildOsmBlocks({elements: [perimeter, inner, building(0.0001), building(0.0008)]}, extent);
    expect(result.length).toBe(2);
    expect(result.filter(polygon => polygon.intersectsCoordinate(fromLonLat([0.001, 0.0005]))).length).toBe(1);
    expect(result.some(polygon => polygon.getCoordinates().length === 2)).toBeTrue();
  });

  it('rejects partial Overpass results', () => {
    expect(() => buildOsmBlocks({elements: [], remark: 'runtime error: timeout'}, extent)).toThrowError(/incomplete/);
  });
});
