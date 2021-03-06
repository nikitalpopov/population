import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/internal/operators';

import { GeoDataService } from '@app/services/geo-data.service';
import { CityInfo } from '@app/models/city-info';

interface CityAutoCompletion {
  value: CityInfo;
  name: string;
  label: string;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  globeEmoji = '🌍';
  isDataLoading = true;

  searchControl = new FormControl({ value: '', disabled: !this.isDataLoading });

  filteredOptions: Subject<Array<CityAutoCompletion>> = new Subject();
  options: Array<CityAutoCompletion>;

  private inputUpdated$: Subject<string> = new Subject();

  constructor(
    private geoDataService: GeoDataService
  ) {}

  ngOnInit(): void {
    this.geoDataService.citiesInfo$.subscribe((citiesInfo) => {
      this.options = citiesInfo.map(cityInfo => ({
        value: cityInfo,
        name: `${cityInfo.city}`,
        label: `${cityInfo.city}, ${cityInfo.country}`
      }));
    });

    this.geoDataService.citiesInfoLoading$.subscribe(isDataLoading => {
      this.isDataLoading = isDataLoading;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      isDataLoading ? this.searchControl.disable() : this.searchControl.enable();
    });

    this.searchControl.valueChanges
      .pipe(startWith(''))
      .subscribe(inputString => {
        this.inputUpdated$.next(inputString);
      });

    this.inputUpdated$.asObservable().pipe(
      debounceTime(1000),
      distinctUntilChanged()
    ).subscribe(inputString => {
      if (inputString.length > 1) {
        const filteredOptions = this.options.filter(option => option.label.toLocaleLowerCase().includes(inputString.toLocaleLowerCase()));
        this.filteredOptions.next(filteredOptions);
      }
    });
  }

  onCitySelection(cityInfo: CityInfo): void {
    this.geoDataService.selectCity(cityInfo);

    switch (true) {
      case cityInfo.coordinates[1] < -30:
        this.globeEmoji = '🌎';
        break;
      case cityInfo.coordinates[1] > 60:
        this.globeEmoji = '🌏';
        break;
      default:
        this.globeEmoji = '🌍';
    }
  }
}
