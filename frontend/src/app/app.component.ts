import { Component, OnInit } from '@angular/core';
import {
  DivIcon,
  LatLng,
  LeafletEvent,
  LeafletMouseEvent,
  Map,
  MapOptions,
  Marker,
  TileLayer
} from 'leaflet';
import { from } from 'rxjs';
import { concatMap } from 'rxjs/internal/operators';

import * as L from 'leaflet';
import 'leaflet.heat';
import 'leaflet.markercluster';

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
  numberOfPoints = 140000;
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
      zoom: 5
    };
  }

  onMapReady(map: Map): void {
    const countryClusters = {};
    const continentClusters = {};

    let heatMapLayer;
    const chunkSize = 1000;

    this.geoDataService
      .getCountryToContinentMapping()
      .subscribe(countryToContinentMapping => {
        this.countryToContinentMapping = countryToContinentMapping;

        from([...Array(this.numberOfPoints / chunkSize).keys()].map(i => ++i))
          .pipe(concatMap(i => this.geoDataService.getCitiesInfo(chunkSize, i)))
          .subscribe(citiesInfo => {
              this.processCitiesInfo(citiesInfo, map, countryClusters, continentClusters);

              if (heatMapLayer) { map.removeLayer(heatMapLayer); }

              // @ts-ignore
              heatMapLayer = L.heatLayer(this.points, { radius: 10 });
              heatMapLayer.addTo(map);
            },
            () => {},
            () => { this.isDataLoading = false; }
          );
      });
  }

  private processCitiesInfo(citiesInfo: any, map, countryClusters, continentClusters): void {
    this.citiesInfo = this.citiesInfo.concat(citiesInfo);

    const points = [];
    citiesInfo.forEach(p => points.push([...p.coordinates, p.population * .002]));
    this.points = this.points.concat(points);

    citiesInfo.forEach(p => {
      if (!p.population) { return; }

      const countryClusterId = p.country;

      if (!countryClusters.hasOwnProperty(countryClusterId)) {
        countryClusters[countryClusterId] = L.markerClusterGroup({
          iconCreateFunction: this.renderClusterIcon,
          // @ts-ignore
          cluster_type: 'country',
          cluster_id: countryClusterId
        });
        countryClusters[countryClusterId].on('animationend', (event: LeafletEvent) => {
          // Object.values(event.target._featureGroup._layers).length === 1
          // when all child markers are clustered
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
              continentClusters[continentClusterId] = L.markerClusterGroup({
                iconCreateFunction: this.renderClusterIcon,
                // @ts-ignore
                cluster_type: 'continent'
              });
              continentClusters[continentClusterId].on('animationend', (event: LeafletEvent) => {
                // enable clustering only for countryClusters where
                // Object.values(event.target._featureGroup._layers).length === 1;
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
