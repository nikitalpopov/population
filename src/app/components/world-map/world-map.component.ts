import { Component, OnInit } from '@angular/core';
import { StringMap } from '@angular/compiler/src/compiler_facade_interface';
import {
  DivIcon,
  LatLng,
  Layer,
  LeafletEvent,
  LeafletMouseEvent,
  Map,
  MapOptions,
  TileLayer
} from 'leaflet';
import { from } from 'rxjs';
import { concatMap } from 'rxjs/internal/operators';

import * as L from 'leaflet';
import 'leaflet.heat';
import 'leaflet.markercluster';

import { CityInfo } from '@models/city-info';
import { PopulationMarker } from '@models/population-marker';
import { GeoDataService } from '@services/geo-data.service';

@Component({
  selector: 'app-world-map',
  templateUrl: './world-map.component.html',
  styleUrls: ['./world-map.component.scss']
})
export class WorldMapComponent implements OnInit {
  options: MapOptions;

  lat = 59.866;
  lng = 30.163;

  isDataLoading = true;
  numberOfPoints = 100000;
  points: Array<any> = [];

  private map: Map;

  private countriesZoomLevel = 5;
  private initialZoomLevel = 5;

  private countryToContinentMapping: StringMap;

  private citiesInfo: Array<CityInfo> = [];

  private countries: { [key: string]: L.MarkerClusterGroup } = {};
  private continents: { [key: string]: L.MarkerClusterGroup } = {};
  private countriesCluster = new L.FeatureGroup();
  private continentsCluster = new L.FeatureGroup();

  constructor(
    private geoDataService: GeoDataService
  ) { }

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
      zoom: this.initialZoomLevel
    };
  }

  onMouseMove(event: LeafletMouseEvent): void {
    this.lat = event?.latlng?.lat;
    this.lng = event?.latlng?.lng;
  }

  onMapZoomEnd(event: LeafletEvent): void {
    this.showCorrectClusters(event.target.getZoom());
  }

  onMapReady(map: Map): void {
    this.map = map;

    this.map.addLayer(this.countriesCluster);
    this.map.addLayer(this.continentsCluster);

    let heatMapLayer: Layer;
    const chunkSize = 5000;

    this.geoDataService
      .getCountryToContinentMapping()
      .subscribe(
        countryToContinentMapping => {
          this.countryToContinentMapping = countryToContinentMapping;

          from([...Array(this.numberOfPoints / chunkSize).keys()].map(i => i + 1))
            .pipe(concatMap(i => this.geoDataService.getCitiesInfo(chunkSize, i)))
            .subscribe(citiesInfo => {
              this.processCitiesInfo(citiesInfo);

              if (heatMapLayer) { map.removeLayer(heatMapLayer); }

              // @ts-ignore
              heatMapLayer = L.heatLayer(this.points, { radius: 10 });
              heatMapLayer.addTo(map);
              this.showCorrectClusters(map.getZoom());
            },
            () => { this.isDataLoading = false; },
            () => { this.isDataLoading = false; }
          );
        }
      );
  }

  private showCorrectClusters(zoomLevel: number): void {
    this.continentsCluster.clearLayers();
    this.countriesCluster.clearLayers();

    if (zoomLevel < this.countriesZoomLevel) {
      Object.values(this.continents).forEach(i => this.continentsCluster.addLayer(i));
    } else {
      Object.values(this.countries).forEach(i => this.countriesCluster.addLayer(i));
    }
  }

  private processCitiesInfo(citiesInfo: any): void {
    this.citiesInfo = this.citiesInfo.concat(citiesInfo);

    const points = [];
    citiesInfo.forEach(p => points.push([...p.coordinates, p.population * .002]));
    this.points = this.points.concat(points);

    citiesInfo.forEach(p => {
      if (!p.population) { return; }

      const countryClusterId = p.country;
      if (!this.countries.hasOwnProperty(countryClusterId)) {
        this.countries[countryClusterId] = L.markerClusterGroup({
          iconCreateFunction: this.renderClusterIcon,
          maxClusterRadius: 120,
          // @ts-ignore
          cluster_type: 'country',
          cluster_id: countryClusterId
        });
      }

      const continentClusterId = this.countryToContinentMapping[countryClusterId] || countryClusterId;
      if (!this.continents.hasOwnProperty(continentClusterId)) {
        this.continents[continentClusterId] = L.markerClusterGroup({
          iconCreateFunction: this.renderClusterIcon,
          maxClusterRadius: 120,
          // @ts-ignore
          cluster_type: 'continent',
          cluster_id: continentClusterId
        });
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

      this.countries[countryClusterId].addLayer(marker);
      this.continents[continentClusterId].addLayer(marker);
    });
  }

  private renderClusterIcon(cluster: any): DivIcon {
    const clusterPopulation = cluster
      .getAllChildMarkers()
      .filter(m => m.options.feature_code !== 'PPLX')
      .map(m => m.options.population)
      .reduce((a, b) => a + b, 0);

    const html = `<b>${clusterPopulation.toLocaleString('ru')}</b>`;

    return clusterPopulation ? new DivIcon({ html }) : new DivIcon();
  }
}
