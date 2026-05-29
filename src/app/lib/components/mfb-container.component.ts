import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input
} from '@angular/core';

import {
  FbFabComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import { AppShellService } from 'src/app/shell/app-shell.service';
import { NotificationManager } from 'src/app/modules/alarms/notification-manager';
import { SKResourceService } from 'src/app/modules/skresources/resources.service';
import type { MFBAction } from 'src/app/types';

@Component({
  selector: 'mfb-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FbFabComponent, FbTooltipDirective],
  template: `
    <div class="mfb-container">
      @if (action() === 'wpt') {
        <fb-fab
          variant="primary"
          icon="add_location"
          ariaLabel="Drop waypoint at vessel position"
          fbTooltip="Mark Vessel Position"
          fbTooltipPosition="above"
          [disabled]="!app.data.vessels.showSelf"
          (pressed)="dropWaypoint()"
        ></fb-fab>
      }
      @if (action() === 'pob') {
        <fb-fab
          variant="danger"
          svgName="alarm-mob"
          ariaLabel="Raise person overboard alarm"
          fbTooltip="Raise POB Alarm"
          fbTooltipPosition="above"
          (pressed)="raisePob()"
        ></fb-fab>
      }
      @if (action() === 'autopilot') {
        <fb-fab
          variant="primary"
          svgName="command-autopilot"
          ariaLabel="Toggle autopilot console"
          fbTooltip="Autopilot Console"
          fbTooltipPosition="above"
          [disabled]="
            !(
              app.featureFlags().autopilotApi &&
              app.data.vessels.self.autopilot.default
            )
          "
          (pressed)="toggleAutopilotConsole()"
        ></fb-fab>
      }
    </div>
  `,
  styles: [
    `
      .mfb-container {
        position: absolute;
        bottom: 23px;
        right: 5px;
        z-index: 5000;
      }
    `
  ]
})
export class MFBContainerComponent {
  protected action = input<MFBAction>();

  protected app = inject(AppFacade);
  private shell = inject(AppShellService);
  private notiMgr = inject(NotificationManager);
  private skres = inject(SKResourceService);

  protected dropWaypoint(): void {
    const pos = this.app.data.vessels.self.position;
    if (pos) {
      this.skres.newWaypointAt(pos);
    }
  }

  protected raisePob(): void {
    this.notiMgr.raiseServerAlarm('mob', 'Person Overboard!');
  }

  protected toggleAutopilotConsole(): void {
    this.shell.toggleAutopilotConsole(!this.app.uiCtrl().autopilotConsole);
  }
}
