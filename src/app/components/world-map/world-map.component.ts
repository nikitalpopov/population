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
import { MapLike } from 'typescript';

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

  defaultLocation: LatLng = L.latLng(59.866, 30.163);

  isDataLoading = true;
  numberOfPoints = 100000;
  points: Array<number[]>;

  private map: Map;
  private heatMapLayer: Layer;

  private regionsZoomLevel = 8;
  private countriesZoomLevel = 5;
  private initialZoomLevel = 8;

  private countryToContinentMapping: StringMap;

  private citiesInfo: Array<CityInfo>;

  private states: MapLike<L.MarkerClusterGroup>;
  private countries: MapLike<L.MarkerClusterGroup>;
  private continents: MapLike<L.MarkerClusterGroup>;

  private statesCluster = new L.FeatureGroup();
  private countriesCluster = new L.FeatureGroup();
  private continentsCluster = new L.FeatureGroup();

  constructor(
    private geoDataService: GeoDataService
  ) {
    if (window.navigator.geolocation) {
      window.navigator.geolocation.getCurrentPosition(position => {
        this.defaultLocation = L.latLng(position.coords.latitude, position.coords.longitude);
        if (this.map) { this.flyToSelectedLocation(); }
      });
    }
  }

  ngOnInit(): void {
    this.init();

    // OpenStreetMaps tiles
    let tilesUrl = `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`;

    if (window.devicePixelRatio > 1) {
      // High res OpenStreetMaps tiles from OSMAnd
      tilesUrl = `https://tile.osmand.net/hd/{z}/{x}/{y}.png`;
    }

    this.options = {
      center: this.defaultLocation,
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

    this.geoDataService.countryToContinentMapping$.subscribe(
      countryToContinentMapping => (this.countryToContinentMapping = countryToContinentMapping)
    );

    this.geoDataService.getCountryToContinentMapping();
  }

  init(): void {
    this.points = [];

    this.states = {};
    this.countries = {};
    this.continents = {};

    this.statesCluster.clearLayers();
    this.countriesCluster.clearLayers();
    this.continentsCluster.clearLayers();

    if (this.heatMapLayer) {
      this.map.removeLayer(this.heatMapLayer);
    }
  }

  onMouseMove(event: LeafletMouseEvent): void {
    this.defaultLocation = event?.latlng;
  }

  onMapZoomEnd(event: LeafletEvent): void {
    this.showCorrectClusters(event.target.getZoom());
  }

  onMapMoveEnd(event: LeafletEvent): void {
    if (!this.map) { return; }

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

    this.map.addLayer(this.statesCluster);
    this.map.addLayer(this.countriesCluster);
    this.map.addLayer(this.continentsCluster);

    this.geoDataService.getCitiesInfo();

    this.geoDataService.citiesInfo$.subscribe(
      this.handleCitiesInfo.bind(this)
    );

    this.geoDataService.selectedLocation$.subscribe(
      this.flyToSelectedLocation.bind(this)
    );
  }

  private handleCitiesInfo(citiesInfo: Array<CityInfo>): void {
    if (!citiesInfo.length) {
      return;
    } else {
      this.init();
    }

    this.map.invalidateSize();

    this.citiesInfo = citiesInfo;
    this.prepareCitiesInfo();

    // @ts-ignore
    this.heatMapLayer = L.heatLayer(this.points, { radius: 10 });
    this.heatMapLayer.addTo(this.map);
    this.showCorrectClusters(this.map.getZoom());
    this.isDataLoading = false;
  }

  private prepareCitiesInfo(): void {
    this.citiesInfo.forEach(p => {
      if (!p.population || p.feature_code === 'PPLX') { return; }

      this.points.push([...p.coordinates, p.population * .002]);

      const countryClusterId = p.country;
      if (!this.countries.hasOwnProperty(countryClusterId)) {
        this.states[countryClusterId] = L.markerClusterGroup({
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

      const icon = new DivIcon({ html: `<b>${p.population.toLocaleString('ru')}</b>` });
      const marker = new PopulationMarker(
        // @ts-ignore
        p.coordinates,
        {
          icon,
          population: p.population,
          feature_code: p.feature_code
        }
      );

      this.states[countryClusterId].addLayer(marker);
      this.countries[countryClusterId].addLayer(marker);
      this.continents[continentClusterId].addLayer(marker);
    });
  }

  private showCorrectClusters(zoomLevel: number): void {
    this.statesCluster.clearLayers();
    this.countriesCluster.clearLayers();
    this.continentsCluster.clearLayers();

    switch (true) {
      case zoomLevel < this.countriesZoomLevel:
        this.addMarkersToContainer(this.continents, this.continentsCluster);
        break;

      case zoomLevel < this.regionsZoomLevel:
        this.addMarkersToContainer(this.countries, this.countriesCluster);
        break;

      default:
        this.addMarkersToContainer(this.states, this.statesCluster);
        break;
    }
  }

  private addMarkersToContainer(markerClusters: MapLike<L.MarkerClusterGroup>, container: L.FeatureGroup): void {
    Object.values(markerClusters).forEach(marker => {
      if (this.map.getBounds().intersects(marker.getBounds())) {
        container.addLayer(marker);
      }
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

  private flyToSelectedLocation(
    location: LatLng = this.defaultLocation,
    zoomLevel: number = this.initialZoomLevel
  ): void {
    this.map.flyTo(location, zoomLevel);
  }
}
