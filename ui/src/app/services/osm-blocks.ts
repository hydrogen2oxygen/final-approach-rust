import {Coordinate} from 'ol/coordinate';
import {containsCoordinate, Extent} from 'ol/extent';
import Polygon from 'ol/geom/Polygon';
import {fromLonLat} from 'ol/proj';
import {getArea} from 'ol/sphere';

export interface OsmWay {
  type: string;
  id: number;
  nodes?: number[];
  geometry?: {lon: number; lat: number}[];
  tags?: Record<string, string>;
}

export interface OsmBlockResponse {
  elements: OsmWay[];
  remark?: string;
}

export const BLOCK_ROADS = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link';

/** Follow directed street edges with the face on the left to find enclosed blocks. */
export function buildOsmBlocks(response: OsmBlockResponse, extent: Extent): Polygon[] {
  if (response.remark || !Array.isArray(response.elements)) {
    throw new Error('OpenStreetMap returned incomplete data. Please select a smaller area and retry.');
  }

  const coordinates = new Map<number, Coordinate>();
  const neighbors = new Map<number, Set<number>>();
  const buildings: Coordinate[] = [];
  const roadTypes = new Set(BLOCK_ROADS.split('|'));

  for (const way of response.elements) {
    if (way.type !== 'way' || !way.geometry?.length) {
      continue;
    }
    const tags = way.tags ?? {};
    const points = way.geometry.map(point => fromLonLat([point.lon, point.lat]));
    if (tags['building'] && tags['building'] !== 'no' && points.length >= 4) {
      buildings.push(new Polygon([points]).getInteriorPoint().getCoordinates());
    }
    if (!roadTypes.has(tags['highway']) || tags['area'] === 'yes'
      || (tags['bridge'] && tags['bridge'] !== 'no')
      || (tags['tunnel'] && tags['tunnel'] !== 'no')
      || (tags['layer'] && tags['layer'] !== '0')
      || way.nodes?.length !== points.length) {
      continue;
    }
    way.nodes.forEach((id, index) => {
      coordinates.set(id, points[index]);
      if (!neighbors.has(id)) {
        neighbors.set(id, new Set());
      }
    });
    for (let index = 1; index < way.nodes.length; index++) {
      const first = way.nodes[index - 1];
      const second = way.nodes[index];
      if (first !== second && (points[index][0] !== points[index - 1][0]
        || points[index][1] !== points[index - 1][1])) {
        neighbors.get(first).add(second);
        neighbors.get(second).add(first);
      }
    }
  }

  // Dead ends belong inside their surrounding block and do not form boundaries.
  const leaves = [...neighbors.keys()].filter(id => neighbors.get(id).size < 2);
  while (leaves.length > 0) {
    const id = leaves.pop();
    for (const neighbor of neighbors.get(id)) {
      neighbors.get(neighbor).delete(id);
      if (neighbors.get(neighbor).size === 1) {
        leaves.push(neighbor);
      }
    }
    neighbors.get(id).clear();
  }

  const ordered = new Map<number, number[]>();
  for (const [id, adjacent] of neighbors) {
    const origin = coordinates.get(id);
    const angle = (other: number): number => {
      const point = coordinates.get(other);
      return Math.atan2(point[1] - origin[1], point[0] - origin[0]);
    };
    ordered.set(id, [...adjacent].sort((first, second) => angle(first) - angle(second)));
  }

  const visited = new Set<string>();
  const rings: Coordinate[][] = [];
  for (const [start, adjacent] of ordered) {
    for (const next of adjacent) {
      let previous = start;
      let current = next;
      const ids: number[] = [];
      while (!visited.has(`${previous}:${current}`)) {
        visited.add(`${previous}:${current}`);
        ids.push(previous);
        const exits = ordered.get(current);
        const following = exits[(exits.indexOf(previous) + exits.length - 1) % exits.length];
        previous = current;
        current = following;
      }
      if (previous !== start || current !== next || ids.length < 3
        || new Set(ids).size !== ids.length) {
        continue;
      }
      const ring = ids.map(id => coordinates.get(id));
      ring.push(ring[0]);
      // Positive winding selects bounded faces, excluding the exterior face.
      const origin = ring[0];
      const signedArea = ring.slice(1).reduce((area, point, index) => {
        const before = ring[index];
        return area + (before[0] - origin[0]) * (point[1] - origin[1])
          - (point[0] - origin[0]) * (before[1] - origin[1]);
      }, 0);
      if (signedArea > 0) {
        rings.push(ring);
      }
    }
  }

  const polygons = rings.map(ring => new Polygon([ring]));
  return polygons.map((polygon, index) => {
    // Disconnected closed streets inside a block become holes, avoiding overlap.
    const children = polygons.filter((candidate, candidateIndex) => candidateIndex !== index
      && candidate.getCoordinates()[0].every(point => polygon.intersectsCoordinate(point)));
    const holes = children.filter(child => !children.some(other => other !== child
      && child.getCoordinates()[0].every(point => other.intersectsCoordinate(point))));
    return new Polygon([rings[index], ...holes.map(hole => hole.getCoordinates()[0].slice().reverse())]);
  }).filter(polygon => polygon.getCoordinates()[0].every(point => containsCoordinate(extent, point))
    && getArea(polygon) >= 400
    && buildings.some(point => polygon.intersectsCoordinate(point)));
}
