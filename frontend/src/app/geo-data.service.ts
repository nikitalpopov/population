import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/internal/operators';

@Injectable({
  providedIn: 'root'
})
export class GeoDataService {
  private httpService: HttpClient;

  private baseUrl = 'https://public.opendatasoft.com/api/records/1.0/search/' +
    '?dataset=geonames-all-cities-with-a-population-1000' +
    '&exclude.feature_code=PPLX' +
    '&sort=population&facet=timezone&facet=country&timezone=UTC';

  private apiUrl = 'https://dapper-local-factory.glitch.me/';

  constructor(httpService: HttpClient) {
    this.httpService = httpService;
  }

  getCitiesInfoFromOpenDataServer(step: number = 10000, start: number = 0): Observable<any> {
    const url = `${this.baseUrl}&rows=${step}&start=${start}`;

    return this.httpService.get(url).pipe(
      map(
        (response: any) => response?.records.map(
          (r: any) => ({
            coordinates: r?.fields?.coordinates,
            population: r?.fields?.population,
            city: r?.fields?.name,
            country: r?.fields?.country_code
          })
        )
      )
    );
  }

  getCitiesInfo(step: number = 100000, start: number = 0): Observable<any> {
    const url = `${this.apiUrl}cities?_sort=population&_order=desc&_limit=${step}&_page=${start}`;

    return this.httpService.get(url);
  }

  getCountryToContinentMapping(): Observable<any> {
    const url = `${this.apiUrl}continent`;

    return this.httpService.get(url);
  }
}
