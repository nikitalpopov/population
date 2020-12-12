import { DivIcon, Marker } from 'leaflet';

export const PopulationMarker = Marker.extend({
  icon: new DivIcon(),
  population: 0,
  feature_code: null
});
