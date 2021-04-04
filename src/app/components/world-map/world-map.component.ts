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

interface ClusterMap {
  [key: string]: L.MarkerClusterGroup;
}

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

  private regionsZoomLevel = 8;
  private countriesZoomLevel = 5;
  private initialZoomLevel = 5;

  private countryToContinentMapping: StringMap;

  private citiesInfo: Array<CityInfo> = [];

  private regions: ClusterMap = {};
  private countries: ClusterMap = {};
  private continents: ClusterMap = {};
  private regionsCluster = new L.FeatureGroup();
  private countriesCluster = new L.FeatureGroup();
  private continentsCluster = new L.FeatureGroup();

  constructor(
    private geoDataService: GeoDataService
  ) {
    if (window.navigator.geolocation) {
      window.navigator.geolocation.getCurrentPosition(position => {
        this.lat = position.coords.latitude;
        this.lng = position.coords.longitude;
      });
    }
  }

  ngOnInit(): void {
    // OpenStreetMaps tiles
    let tilesUrl = `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`;

    if (window.devicePixelRatio > 1) {
      // High res OpenStreetMaps tiles from OSMAnd
      tilesUrl = `https://tile.osmand.net/hd/{z}/{x}/{y}.png`;
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

  onMapMoveEnd(event: LeafletEvent): void {
    if (this.map.getCenter().lat < -80) {
      this.map.flyTo({ lat: -80, lng: this.map.getCenter().lng });
    }

    if (this.map.getCenter().lat > 80) {
      this.map.flyTo({ lat: 80, lng: this.map.getCenter().lng });
    }

    this.showCorrectClusters(event.target.getZoom());
  }

  onMapReady(map: Map): void {
    this.map = map;

    this.map.addLayer(this.regionsCluster);
    this.map.addLayer(this.countriesCluster);
    this.map.addLayer(this.continentsCluster);

    let heatMapLayer: Layer;
    const chunkSize = 20000;

    this.geoDataService
      .getCountryToContinentMapping()
      .subscribe(
        countryToContinentMapping => {
          this.countryToContinentMapping = countryToContinentMapping;

          from([...Array(this.numberOfPoints / chunkSize).keys()].map(i => i + 1))
            .pipe(concatMap(i => this.geoDataService.getCitiesInfo(chunkSize, i)))
            .subscribe(
              citiesInfo => {
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
    this.regionsCluster.clearLayers();
    this.countriesCluster.clearLayers();
    this.continentsCluster.clearLayers();

    switch (true) {
      case zoomLevel < this.countriesZoomLevel:
        Object.values(this.continents).forEach(i => this.addMarkersToContainer(i, this.continentsCluster));
        break;

      case zoomLevel < this.regionsZoomLevel:
        Object.values(this.countries).forEach(i => this.addMarkersToContainer(i, this.countriesCluster));
        break;

      default:
        Object.values(this.regions).forEach(i => this.addMarkersToContainer(i, this.regionsCluster));
        break;
    }
  }

  private addMarkersToContainer(marker: L.MarkerClusterGroup, container: L.FeatureGroup): void {
    if (this.map.getBounds().intersects(marker.getBounds())) {
      container.addLayer(marker);
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
        this.regions[countryClusterId] = L.markerClusterGroup({
          iconCreateFunction: this.renderClusterIcon,
          // @ts-ignore
          cluster_type: 'country',
          cluster_id: countryClusterId
        });

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

      this.regions[countryClusterId].addLayer(marker);
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

    return new DivIcon(clusterPopulation ? { html } : undefined);
  }
}
