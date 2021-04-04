import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { Observable } from 'rxjs';

import { WorldMapComponent } from '@components/world-map/world-map.component';
import { GeoDataService } from '@services/geo-data.service';

const geoDataServiceMock = {
  getCitiesInfoFromOpenDataServer: () => new Observable(),
  getCitiesInfo: () => new Observable(),
  getCountryToContinentMapping: () => new Observable()
};

describe('WorldMapComponent', () => {
  let component: WorldMapComponent;
  let fixture: ComponentFixture<WorldMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WorldMapComponent],
      providers: [
        { provide: GeoDataService, useValue: geoDataServiceMock }
      ],
      imports: [LeafletModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WorldMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have map', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled).not.toBeNull();
  });
});
