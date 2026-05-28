import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FbIconComponent } from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import { RadarAPIService } from 'src/app/modules/radar/radar-api.service';

@Component({
  selector: 'radar-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatTooltipModule, FbIconComponent],
  template: `
    <button
      mat-fab
      [disabled]="!active()"
      (click)="handleClick()"
      matTooltip="Radar Overlay"
      matTooltipPosition="above"
      aria-label="Toggle radar overlay"
    >
      @if (app.uiCtrl().radarLayer) {
        <fb-icon
          class="ob"
          svgName="chart-radar-overlay-iec"
          ariaLabel=""
        ></fb-icon>
      } @else {
        <fb-icon class="ob" svgName="radar-iec" ariaLabel=""></fb-icon>
      }
    </button>
  `,
  styles: []
})
export class RadarButtonComponent {
  protected active = input<boolean>(false);

  protected app = inject(AppFacade);
  protected radarApi = inject(RadarAPIService);

  constructor() {}

  handleClick() {
    this.app.uiCtrl.update((current) => {
      const show = !current.radarLayer;
      return Object.assign({}, current, { radarLayer: show });
    });
  }
}
