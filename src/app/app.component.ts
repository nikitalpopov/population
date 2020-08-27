import { Component, OnInit } from '@angular/core';
import { tileLayer, latLng, MapOptions } from 'leaflet';

import * as L from 'leaflet';
import 'leaflet.heat/dist/leaflet-heat.js';
import 'leaflet.markercluster/dist/leaflet.markercluster.js';

import { CityInfo } from './city-info';
import { GeoDataService } from './geo-data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  options: MapOptions;

  lat: number;
  lng: number;

  private geoDataService: GeoDataService;

  private citiesInfo: Array<CityInfo> = [];
  private points: Array<any> = [];

  constructor(
    geoDataService: GeoDataService
  ) {
    this.geoDataService = geoDataService;
  }

  ngOnInit(): void {
    let tilesUrl = `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`; // OpenStreetMaps tiles

    if (window.devicePixelRatio > 1) {
      tilesUrl = `https://tile.osmand.net/hd/{z}/{x}/{y}.png`; // High res OpenStreetMaps tiles from OSMAnd
    }

    this.options = {
      center: latLng(59.866, 30.163),
      layers: [
        tileLayer(tilesUrl, { maxZoom: 18 })
      ],
      worldCopyJump: true,
      zoom: 7
    };
  }

  onMapReady(map: L.Map): void {
    const PopulationMarker = L.Marker.extend({
      icon: L.divIcon(),
      population: 0
    });

    const markers = (L as any).markerClusterGroup({
      iconCreateFunction: (cluster) => L.divIcon({ html: `<b>${
        (cluster.getAllChildMarkers().map(m => m.options.population).reduce((a, b) => a + b, 0)).toLocaleString('ru')
      }</b>` })
    });
    map.addLayer(markers);

    let heatMapLayer;
    const chunkSize = 500;

    for (let i = 0; i < 10000; i += chunkSize) {
      this.geoDataService.getCitiesInfo(chunkSize, i).subscribe(data => {
        data = data.filter(d => !this.citiesInfo.find(p => p.city === d.city));
        this.citiesInfo = this.citiesInfo.concat(data);

        const points = [];
        data.forEach(p => points.push([...p.coordinates, p.population * .002]));
        this.points = this.points.concat(points);
        data.forEach(p => markers.addLayer(new PopulationMarker(
          // @ts-ignore
          p.coordinates,
          {
            icon: L.divIcon({ html: `<b>${(p.population).toLocaleString('ru')}</b>` }),
            population: p.population
          }
        )));

        if (heatMapLayer) map.removeLayer(heatMapLayer);

        // @ts-ignore
        heatMapLayer = L.heatLayer(this.points, { radius: 10 });
        heatMapLayer.addTo(map);
      });
    }
  }

  onMouseMove(event: L.LeafletMouseEvent): void {
    this.lat = event?.latlng?.lat;
    this.lng = event?.latlng?.lng;
  }
}
