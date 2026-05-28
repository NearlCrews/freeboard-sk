/** Trail2Route Dialog Component **
 ********************************/

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

import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';

import {
  FbButtonComponent,
  FbIconComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

import { FreeboardOpenlayersModule } from 'src/app/modules/map/ol';
import { SimplifyAP } from 'src/lib/simplify-ts';
import { SKResourceService, SKStreamFacade, SKRoute } from 'src/app/modules';
import { AppFacade } from 'src/app/app.facade';

/********* Trail2RouteDialog **********
	data: {
    }
***********************************/
@Component({
  selector: 'ap-trail2routedialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbIconComponent,
    MatDialogModule,
    MatTooltipModule,
    MatSliderModule,
    MatCheckboxModule,
    FbToolbarComponent,
    FreeboardOpenlayersModule
  ],
  templateUrl: `./trail2route-dialog.html`,
  styles: [
    `
      ._ap-trail2route {
        font-family: arial;
        min-width: 300px;
      }
    `
  ]
})
export class Trail2RouteDialog implements OnInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rteFromTrail: any[] = [];
  mapCenter = [0, 0];
  pointCount = 0;
  incServer = false;

  tolerance = 0.000001;
  highQuality = true;

  mapControls = [{ name: 'zoom' }];

  private destroyRef = inject(DestroyRef);
  private fetching = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serverCoords: any[] = [];

  constructor(
    private skres: SKResourceService,
    protected app: AppFacade,
    private stream: SKStreamFacade,
    public dialogRef: MatDialogRef<Trail2RouteDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  //** lifecycle: events **
  ngOnInit() {
    this.parseTrail(false, true);
    this.stream
      .trail$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.onServerResource(value));
    this.getServerTrail(this.app.config.vessels.trailFromServer);
  }

  changeTolerance(val: number) {
    this.tolerance = val;
    this.parseTrail();
  }

  parseTrail(incServer?: boolean, center?: boolean) {
    let trail: number[][] = [...((this.data.trail as number[][]) ?? [])];
    if (incServer) {
      trail = [...this.serverCoords, ...trail];
    }
    const rteCoords = SimplifyAP(
      trail as never[],
      this.tolerance,
      this.highQuality
    ) as number[][];
    this.pointCount = rteCoords.length;
    if (center && rteCoords.length > 0) {
      const midpoint = rteCoords[Math.floor(rteCoords.length / 2)];
      if (midpoint) {
        this.mapCenter = midpoint;
      }
    }
    const rte = new SKRoute();
    rte.feature.geometry.coordinates = rteCoords as never;
    this.rteFromTrail = [['rtefromtrail', rte, true]];
  }

  doClose(save: boolean) {
    let coords = [];
    if (save) {
      coords = this.rteFromTrail[0][1].feature.geometry.coordinates;
    }
    this.dialogRef.close({ result: save, data: coords });
  }

  // retrieve trail from server
  getServerTrail(checked: boolean) {
    if (checked) {
      if (
        !this.app.config.vessels.trailFromServer ||
        this.serverCoords.length === 0
      ) {
        this.fetching = true;
        this.stream.requestTrailFromServer();
      } else {
        this.parseTrail(true);
      }
    } else {
      this.parseTrail();
    }
  }

  // get server trail event handler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onServerResource(value: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let serverTrail: any[] = [];
    if (this.fetching && value.action === 'get' && value.mode === 'trail') {
      this.fetching = false;
      serverTrail = value.data;
      this.serverCoords = [];
      serverTrail.forEach((line) => {
        this.serverCoords = this.serverCoords.concat(line);
      });
      this.parseTrail();
    }
  }
}
