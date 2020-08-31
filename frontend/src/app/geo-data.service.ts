import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/internal/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeoDataService {
  private httpService: HttpClient;

  private baseUrl = 'https://public.opendatasoft.com/api/records/1.0/search/' +
    '?dataset=geonames-all-cities-with-a-population-1000' +
    '&exclude.feature_code=PPLX' +
    '&sort=population&facet=timezone&facet=country&timezone=UTC';

  private localUrl = 'http://localhost:3000/';

  private vercelApiUrl = 'https://population-backend.vercel.app/';

  constructor(httpService: HttpClient) {
    this.httpService = httpService;
  }

  getCitiesInfo(step: number = 10000, start: number = 0): Observable<any> {
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

  getCitiesInfoFromLocalServer(step: number = 100000, start: number = 0): Observable<any> {
    const url = `${this.localUrl}cities?_sort=population&_order=desc&_limit=${step}&_page=${start}`;

    return this.httpService.get(url);
  }

  getCountryToContinentMapping(): Observable<any> {
    const url = `${this.localUrl}continent`;

    return this.httpService.get(url);
  }
}
