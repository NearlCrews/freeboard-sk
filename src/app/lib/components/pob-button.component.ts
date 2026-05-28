import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FbIconComponent } from 'src/app/design-system/primitives';
import { NotificationManager } from 'src/app/modules';

@Component({
  selector: 'pob-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatTooltipModule, FbIconComponent],
  template: `
    <button
      class="button-warn"
      mat-fab
      (click)="raiseAlarm()"
      matTooltip="Raise POB Alarm"
      matTooltipPosition="above"
      aria-label="Raise person overboard alarm"
    >
      <fb-icon class="ob" svgName="alarm-mob" ariaLabel=""></fb-icon>
    </button>
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
