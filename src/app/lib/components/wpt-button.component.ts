import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SKResourceService } from 'src/app/modules';
import type { Position } from 'src/app/types';

import { FbIconComponent } from 'src/app/design-system/primitives';

@Component({
  selector: 'wpt-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbIconComponent, MatButtonModule, MatTooltipModule],
  template: `
    <button
      mat-fab
      [disabled]="!active()"
      (click)="dropWaypoint()"
      matTooltip="Mark Vessel Position"
      matTooltipPosition="above"
      aria-label="Drop waypoint at vessel position"
    >
      <fb-icon name="add_location" ariaLabel=""></fb-icon>
    </button>
  `,
  styles: []
})
export class WptButtonComponent {
  protected position = input<Position>([0, 0]);
  protected active = input<boolean>(false);

  private skres = inject(SKResourceService);

  constructor() {}

  protected dropWaypoint() {
    this.skres.newWaypointAt(this.position());
  }
}
