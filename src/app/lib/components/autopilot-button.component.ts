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

@Component({
  selector: 'autopilot-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbFabComponent, FbTooltipDirective],
  template: `
    <fb-fab
      variant="primary"
      svgName="command-autopilot"
      ariaLabel="Toggle autopilot console"
      fbTooltip="Autopilot Console"
      fbTooltipPosition="above"
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
