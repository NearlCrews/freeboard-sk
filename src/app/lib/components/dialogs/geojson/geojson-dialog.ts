import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Inject,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbIconComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

import { GeoJSONLoadFacade } from './geojson-dialog.facade';
import { AppFacade } from 'src/app/app.facade';

//** GeoJSON import dialog **
@Component({
  selector: 'geojson-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    FbButtonComponent,
    FbCardComponent,
    FbCardContentComponent,
    FbIconComponent,
    FbToolbarComponent
  ],
  templateUrl: './geojson-dialog.html',
  styleUrls: ['./geojson-dialog.css']
})
export class GeoJSONImportDialog implements OnInit {
  public geoData: {
    name: string;
    routes: any[];
    waypoints: any[];
    tracks: any[];
    regions: any[];
    value: any;
  } = {
    name: '',
    routes: [],
    waypoints: [],
    tracks: [],
    regions: [],
    value: null
  };

  public display = {
    notValid: false
  };

  private destroyRef = inject(DestroyRef);

  constructor(
    public app: AppFacade,
    public facade: GeoJSONLoadFacade,
    public dialogRef: MatDialogRef<GeoJSONImportDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.data.fileData = this.data.fileData || null;
    this.parseFileData(this.data.fileData);

    // ** close dialog returning error count **
    this.facade.uploaded$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((errCount) => {
        this.dialogRef.close(errCount);
      });
  }

  // ** upload features to server **
  load() {
    this.facade.uploadToServer(this.geoData.value);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseFileData(fileData: any) {
    this.geoData.value = this.facade.validate(fileData);
    if (!this.geoData.value) {
      console.warn('Error:', 'Invalid GeoJSON file!');
      this.display.notValid = true;
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.geoData.value.features.forEach((f: any) => {
      if (f.type && f.type === 'Feature' && f.geometry && f.geometry.type) {
        switch (f.geometry.type) {
          case 'LineString': // route
            this.geoData.routes.push(f);
            break;
          case 'Point': // waypoint
            this.geoData.waypoints.push(f);
            break;
          case 'MultiLineString': // track
            this.geoData.tracks.push(f);
            break;
          case 'Polygon': // region
          case 'MultiPolygon':
            this.geoData.regions.push(f);
            break;
        }
      }
    });
  }
}
