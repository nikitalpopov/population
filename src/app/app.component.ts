import { Component, OnInit } from '@angular/core';
import { tileLayer, latLng, MapOptions } from 'leaflet';

import * as L from 'leaflet';
import 'leaflet.heat/dist/leaflet-heat.js';
import 'leaflet.markercluster/dist/leaflet.markercluster.js';

import { CityInfo } from './city-info';
import { GeoDataService } from './geo-data.service';

const PopulationMarker = L.Marker.extend({
  icon: L.divIcon(),
  population: 0
});

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  options: MapOptions;

  lat = 59.866;
  lng = 30.163;

  isDataLoading = true;
  numberOfPoints = 10000;
  points: Array<any> = [];

  private geoDataService: GeoDataService;
  private countryToContinentMapping;

  private citiesInfo: Array<CityInfo> = [];

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
      center: latLng(this.lat, this.lng),
      layers: [
        tileLayer(tilesUrl, { maxZoom: 18 })
      ],
      worldCopyJump: true,
      zoom: 7
    };

    this.geoDataService.getCountryToContinentMapping().subscribe(data => this.countryToContinentMapping = data);
  }

  onMapReady(map: L.Map): void {
    const countryClusters = {};

    let heatMapLayer;
    const chunkSize = 500;

    for (let i = 0; i < this.numberOfPoints; i += chunkSize) {
      this.geoDataService.getCitiesInfo(chunkSize, i).subscribe(data => {
        this.citiesInfo = this.citiesInfo.concat(data);

        const points = [];
        data.forEach(p => points.push([...p.coordinates, p.population * .002]));
        this.points = this.points.concat(points);

        data.forEach(p => {
          const clusterId = this.countryToContinentMapping[p.country] || p.country;

          if (!countryClusters.hasOwnProperty(clusterId)) {
            countryClusters[clusterId] = (L as any).markerClusterGroup({
              iconCreateFunction: this.renderClusterIcon
            });
            map.addLayer(countryClusters[clusterId]);
          }

          const marker = new PopulationMarker(
            // @ts-ignore
            p.coordinates,
            {
              icon: L.divIcon({ html: `<b>${p.population.toLocaleString('ru')}</b>` }),
              population: p.population
            }
          );
          countryClusters[clusterId].addLayer(marker);
        });


        if (heatMapLayer) map.removeLayer(heatMapLayer);

        // @ts-ignore
        heatMapLayer = L.heatLayer(this.points, { radius: 10 });
        heatMapLayer.addTo(map);

        if (this.points.length === 10000) this.isDataLoading = false;
      });
    }
  }

  private renderClusterIcon(cluster): L.DivIcon {
    return L.divIcon({
      html: `<b>${
        cluster
          .getAllChildMarkers()
          .map(m => m.options.population)
          .reduce((a, b) => a + b, 0)
          .toLocaleString('ru')
      }</b>`
    });
  }

  onMouseMove(event: L.LeafletMouseEvent): void {
    this.lat = event?.latlng?.lat;
    this.lng = event?.latlng?.lng;
  }
}
