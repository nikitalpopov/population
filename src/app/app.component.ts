import { Component, OnInit } from '@angular/core';
import { tileLayer, latLng, MapOptions } from 'leaflet';

import * as L from 'leaflet';
import 'leaflet.heat/dist/leaflet-heat.js';

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

  private citiesInfo: Array<CityInfo>;

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
    this.geoDataService.getCitiesInfo().subscribe(data => {
      this.citiesInfo = data;

      const points = [];
      data.forEach(p => points.push([...p.coordinates, p.population * .005]));

      // @ts-ignore
      const heat = L.heatLayer(points, { radius: 10 }).addTo(map);
    });
  }

  onMouseMove(event: L.LeafletMouseEvent): void {
    this.lat = event?.latlng?.lat;
    this.lng = event?.latlng?.lng;
  }
}
