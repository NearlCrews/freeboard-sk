import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FbIconComponent } from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';

@Component({
  selector: 'autopilot-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatTooltipModule, FbIconComponent],
  template: `
    <button
      [ngClass]="{
        'button-primary': app.data.vessels.self.autopilot.enabled,
        'button-toolbar':
          !app.data.vessels.self.autopilot.enabled ||
          !app.featureFlags().autopilotApi ||
          !app.data.vessels.self.autopilot.default
      }"
      mat-fab
      [disabled]="!active()"
      (click)="handleClick()"
      matTooltip="Autopilot Console"
      matTooltipPosition="above"
      aria-label="Toggle autopilot console"
    >
      <fb-icon class="ob" svgName="command-autopilot" ariaLabel=""></fb-icon>
    </button>
  `,
  styles: []
})
export class AutopilotButtonComponent {
  protected active = input<boolean>(false);

  protected app = inject(AppFacade);

  constructor() {}

  handleClick() {
    this.app.uiCtrl.update((current) => {
      const show = !current.autopilotConsole;
      return Object.assign({}, current, { autopilotConsole: show });
    });
  }
}
