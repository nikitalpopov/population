import { HttpClient } from '@angular/common/http';
import { StringMap } from '@angular/compiler/src/compiler_facade_interface';
import { Injectable } from '@angular/core';
import { BehaviorSubject, from, Observable, Subject } from 'rxjs';
import { concatMap, map, reduce } from 'rxjs/internal/operators';

import * as L from 'leaflet';

import { CityInfo } from '@models/city-info';

@Injectable({
  providedIn: 'root'
})
export class GeoDataService {
  citiesInfo$: BehaviorSubject<Array<CityInfo>> = new BehaviorSubject([]);
  countryToContinentMapping$: Subject<StringMap> = new Subject();
  selectedLocation$: Subject<L.LatLng> = new Subject();

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
      this.citiesInfo$.next(acc);
    } else {
      this.requestCitiesInfo(volume, step);
    }
  }

  getCountryToContinentMapping(): void {
    const countryToContinentMap = JSON.parse(localStorage.getItem(`countryToContinentMap`));
    if (countryToContinentMap) {
      this.countryToContinentMapping$.next(countryToContinentMap);
    } else {
      this.requestCountryToContinentMapping();
    }
  }

  selectCity(cityInfo: CityInfo): void {
    const location = L.latLng({
      lat: cityInfo.coordinates[0],
      lng: cityInfo.coordinates[1]
    });
    this.selectedLocation$.next(location);
  }

  private requestCitiesInfo(volume: number = 100000, step: number = 20000): void {
    localStorage.setItem(`citiesInfo_length`, '0');
    // let saveToLocalStorage = true;

    from([...Array(volume / step).keys()].map(i => i + 1))
      .pipe(
        concatMap(i => this.httpService.get<Array<CityInfo>>(
          `/cities?_sort=population&_order=desc&_limit=${step}&_page=${i}`
        )),
        reduce((acc, value, index) => {
          // if (saveToLocalStorage) {
          //   // LocalStorage has 5mb quota which always leads to error (original minified JSON has 16+ Mb of data)
          //   // TODO Apply lz-string library? Replace localStorage with IndexedDB?
          //   localStorage.setItem(`citiesInfo_length`, `${index + 1}`);
          //   try {
          //     localStorage.setItem(`citiesInfo_${index}`, JSON.stringify(value));
          //   } catch (e) {
          //     saveToLocalStorage = false;
          //     for (const i of [...Array(index).keys()]) {
          //       localStorage.removeItem(`citiesInfo_${i}`);
          //     }
          //     localStorage.removeItem(`citiesInfo_length`);
          //   }
          // }

          return acc.concat(value);
        }, [])
      )
      .subscribe(citiesInfo => {
        this.citiesInfo$.next(citiesInfo);
      });
  }

  private requestCountryToContinentMapping(): void {
    this.httpService.get<StringMap>(`/continent`).subscribe(mapping => {
      this.countryToContinentMapping$.next(mapping);
      localStorage.setItem(`countryToContinentMap`, JSON.stringify(mapping));
    });
  }
}
