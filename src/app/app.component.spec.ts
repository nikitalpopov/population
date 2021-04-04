import { TestBed, waitForAsync } from '@angular/core/testing';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';

import { AppComponent } from '@app/app.component';
import { WorldMapComponent } from '@components/world-map/world-map.component';

describe('AppComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        WorldMapComponent
      ],
      imports: [LeafletModule]
    }).compileComponents();
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
