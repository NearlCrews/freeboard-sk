import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FbFabComponent } from 'src/app/design-system/primitives';
import { NotificationManager } from 'src/app/modules';

@Component({
  selector: 'pob-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTooltipModule, FbFabComponent],
  template: `
    <fb-fab
      variant="danger"
      svgName="alarm-mob"
      ariaLabel="Raise person overboard alarm"
      matTooltip="Raise POB Alarm"
      matTooltipPosition="above"
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
