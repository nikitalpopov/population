import { Component, OnInit } from '@angular/core';
import { DivIcon, LatLng, LeafletMouseEvent, Map, MapOptions, Marker, TileLayer } from 'leaflet';
import { concat } from 'rxjs';

import * as L from 'leaflet';
import 'leaflet.heat';
import 'leaflet.markercluster';
import 'leaflet.markercluster.freezable';

import { CityInfo } from './city-info';
import { GeoDataService } from './geo-data.service';

const PopulationMarker = Marker.extend({
  icon: new DivIcon(),
  population: 0,
  feature_code: null
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
  numberOfPoints = 100000;
  points: Array<any> = [];

  private geoDataService: GeoDataService;
  private countryToContinentMapping: { [key: string]: string };

  private citiesInfo: Array<CityInfo> = [];

  private enableContinentClusters = true;

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
      center: new LatLng(this.lat, this.lng),
      layers: [
        new TileLayer(tilesUrl, {
          attribution: `<a href="https://www.openstreetmap.org/">OpenStreetMap</a>` +
            ` | <a href="https://github.com/nikitalpopov/population">Repo on 🐙</a>`,
          maxZoom: 18
        })
      ],
      worldCopyJump: true,
      zoom: 7
    };

    this.geoDataService.getCountryToContinentMapping().subscribe(data => this.countryToContinentMapping = data);
  }

  onMapReady(map: Map): void {
    const countryClusters = {};
    const continentClusters = {};

    let heatMapLayer;
    const chunkSize = 10000;

    for (let i = 1; i < (this.numberOfPoints / chunkSize); i ++) {
      this.geoDataService.getCitiesInfoFromLocalServer(chunkSize, i).subscribe(data => {
        this.citiesInfo = this.citiesInfo.concat(data);

        const points = [];
        data.forEach(p => points.push([...p.coordinates, p.population * .002]));
        this.points = this.points.concat(points);

        data.forEach(p => {
          if (!p.population) { return; }

          const countryClusterId = p.country;

          if (!countryClusters.hasOwnProperty(countryClusterId)) {
            countryClusters[countryClusterId] = (L as any).markerClusterGroup({
              iconCreateFunction: this.renderClusterIcon
            });
            if (!this.enableContinentClusters) { map.addLayer(countryClusters[countryClusterId]); }
          }

          const icon = p.feature_code !== 'PPLX' ?
            new DivIcon({ html: `<b>${p.population.toLocaleString('ru')}</b>` }) :
            new DivIcon();
          const marker = new PopulationMarker(
            // @ts-ignore
            p.coordinates,
            {
              icon,
              population: p.population,
              feature_code: p.feature_code
            }
          );
          countryClusters[countryClusterId].addLayer(marker);
        });

        if (this.enableContinentClusters) {
          for (const key in countryClusters) {
            if (countryClusters[key]) {
              const continentClusterId = this.countryToContinentMapping[key] || null;

              if (continentClusterId) {
                if (!continentClusters.hasOwnProperty(continentClusterId)) {
                  continentClusters[continentClusterId] = (L as any).markerClusterGroup({
                    iconCreateFunction: this.renderClusterIcon
                  });
                  map.addLayer(continentClusters[continentClusterId]);
                }

                continentClusters[continentClusterId].addLayer(countryClusters[key]);
              } else {
                map.addLayer(countryClusters[key]);
              }
            }
          }
        }

        if (heatMapLayer) { map.removeLayer(heatMapLayer); }

        // @ts-ignore
        heatMapLayer = L.heatLayer(this.points, { radius: 10 });
        heatMapLayer.addTo(map);
      });

      if (this.points.length === this.numberOfPoints) { this.isDataLoading = false; }
    }
  }

  private renderClusterIcon(cluster): DivIcon {
    const clusterPopulation = cluster
      .getAllChildMarkers()
      .filter(m => m.options.feature_code !== 'PPLX')
      .map(m => m.options.population)
      .reduce((a, b) => a + b, 0);

    const html = `<b>${clusterPopulation.toLocaleString('ru')}</b>`;

    return clusterPopulation ? new DivIcon({ html }) : new DivIcon();
  }

  onMouseMove(event: LeafletMouseEvent): void {
    this.lat = event?.latlng?.lat;
    this.lng = event?.latlng?.lng;
  }
}
