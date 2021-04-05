import { HttpClient } from '@angular/common/http';
import { StringMap } from '@angular/compiler/src/compiler_facade_interface';
import { Injectable } from '@angular/core';
import { from, Observable, Subscriber } from 'rxjs';
import { concatMap, map, reduce } from 'rxjs/internal/operators';

import { CityInfo } from '@models/city-info';

@Injectable({
  providedIn: 'root'
})
export class GeoDataService {
  citiesInfo$: Observable<Array<CityInfo>> = new Observable(
    subscriber => this.citiesInfoObserver = subscriber
  );
  countryToContinentMapping$: Observable<StringMap> = new Observable(
    subscriber => this.countryToContinentMappingObserver = subscriber
  );

  private citiesInfoObserver: Subscriber<CityInfo[]>;
  private countryToContinentMappingObserver: Subscriber<StringMap>;

  private baseUrl = 'https://public.opendatasoft.com/api/records/1.0/search/' +
    '?dataset=geonames-all-cities-with-a-population-1000' +
    '&exclude.feature_code=PPLX' +
    '&sort=population&facet=timezone&facet=country&timezone=UTC';

  constructor(private httpService: HttpClient) {
    this.httpService = httpService;
  }

  getCitiesInfoFromOpenDataServer(step: number = 10000, start: number = 0): Observable<Array<CityInfo>> {
    const url = `${this.baseUrl}&rows=${step}&start=${start}`;

    return this.httpService.get(url).pipe(
      map(
        (response: any) => response?.records.map(
          (r: any) => ({
            coordinates: r?.fields?.coordinates,
            population: r?.fields?.population,
            city: r?.fields?.name,
            country: r?.fields?.country_code,
            feature_code: r?.fields?.feature_code
          })
        )
      )
    );
  }

  getCitiesInfo(volume?: number, step?: number): void {
    const len = +localStorage.getItem('citiesInfo_length');
    if (len) {
      const acc = [];
      for (let i = 0; i < len; i++) {
        acc.concat(JSON.parse(localStorage.getItem(`citiesInfo_${i}`)));
      }
      this.citiesInfoObserver.next(acc);
    } else {
      this.requestCitiesInfo(volume, step);
    }
  }

  getCountryToContinentMapping(): void {
    const countryToContinentMap = JSON.parse(localStorage.getItem(`countryToContinentMap`));
    if (countryToContinentMap) {
      this.countryToContinentMappingObserver.next(countryToContinentMap);
    } else {
      this.requestCountryToContinentMapping();
    }
  }

  private requestCitiesInfo(volume: number = 100000, step: number = 20000): void {
    localStorage.setItem(`citiesInfo_length`, '0');

    from([...Array(volume / step).keys()].map(i => i + 1))
      .pipe(
        concatMap(i => this.httpService.get<Array<CityInfo>>(
          `/cities?_sort=population&_order=desc&_limit=${step}&_page=${i}`
        )),
        reduce((acc, value, index) => {
          // LocalStorage has 5mb quota which always leads to error (original minified JSON has 16+ Mb of data)
          // TODO Apply lz-string library? Replace localStorage with IndexedDB?
          try {
            localStorage.setItem(`citiesInfo_${index}`, JSON.stringify(value));
            localStorage.setItem(`citiesInfo_length`, `${index + 1}`);
          } catch (e) {
            localStorage.setItem(`citiesInfo_length`, '0');
          }

          return acc.concat(value);
        }, [])
      )
      .subscribe(citiesInfo => {
        this.citiesInfoObserver.next(citiesInfo);
      });
  }

  private requestCountryToContinentMapping(): void {
    this.httpService.get<StringMap>(`/continent`).subscribe(mapping => {
      this.countryToContinentMappingObserver.next(mapping);
      localStorage.setItem(`countryToContinentMap`, JSON.stringify(mapping));
    });
  }
}
