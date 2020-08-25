import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/internal/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeoDataService {
  private httpService: HttpClient;

  private numberOfCities = 10000;

  constructor(httpService: HttpClient) {
    this.httpService = httpService;
  }

  getCitiesInfo(): Observable<any> {
    const url = 'https://public.opendatasoft.com/api/records/1.0/search/' +
      `?dataset=geonames-all-cities-with-a-population-1000&rows=${this.numberOfCities}&sort=population&facet=timezone&facet=country&timezone=UTC`;

    return this.httpService.get(url).pipe(
      map(
        (response: any) => response?.records.map(
          (r: any) => ({
            coordinates: r?.fields?.coordinates,
            population: r?.fields?.population,
            city: r?.fields?.name
          })
        )
      )
    );
  }
}
