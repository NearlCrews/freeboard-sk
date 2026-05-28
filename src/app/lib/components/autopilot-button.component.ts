import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input
} from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FbFabComponent } from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';

@Component({
  selector: 'autopilot-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTooltipModule, FbFabComponent],
  template: `
    <fb-fab
      variant="primary"
      svgName="command-autopilot"
      ariaLabel="Toggle autopilot console"
      matTooltip="Autopilot Console"
      matTooltipPosition="above"
      [disabled]="!active()"
      (pressed)="handleClick()"
    ></fb-fab>
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
