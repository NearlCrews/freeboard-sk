import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input
} from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SKResourceService } from 'src/app/modules';
import type { Position } from 'src/app/types';

import { FbFabComponent } from 'src/app/design-system/primitives';

@Component({
  selector: 'wpt-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbFabComponent, MatTooltipModule],
  template: `
    <fb-fab
      variant="primary"
      icon="add_location"
      ariaLabel="Drop waypoint at vessel position"
      matTooltip="Mark Vessel Position"
      matTooltipPosition="above"
      [disabled]="!active()"
      (pressed)="dropWaypoint()"
    ></fb-fab>
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
