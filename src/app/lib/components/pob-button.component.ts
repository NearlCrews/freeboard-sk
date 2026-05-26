import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationManager } from 'src/app/modules';

@Component({
  selector: 'pob-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <button
      class="button-warn"
      mat-fab
      (click)="raiseAlarm()"
      matTooltip="Raise POB Alarm"
      matTooltipPosition="above"
      aria-label="Raise person overboard alarm"
    >
      <mat-icon class="ob" svgIcon="alarm-mob"></mat-icon>
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
