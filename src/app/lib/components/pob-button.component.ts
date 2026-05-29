import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FbFabComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';
import { NotificationManager } from 'src/app/modules';

@Component({
  selector: 'pob-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbFabComponent, FbTooltipDirective],
  template: `
    <fb-fab
      variant="danger"
      svgName="alarm-mob"
      ariaLabel="Raise person overboard alarm"
      fbTooltip="Raise POB Alarm"
      fbTooltipPosition="above"
      (pressed)="raiseAlarm()"
    ></fb-fab>
  `,
  styles: []
})
export class POBButtonComponent {
  private notiMgr = inject(NotificationManager);

  constructor() {}

  protected raiseAlarm() {
    this.notiMgr.raiseServerAlarm('mob', 'Person Overboard!');
  }
}
