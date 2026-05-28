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
import { RadarAPIService } from 'src/app/modules/radar/radar-api.service';

@Component({
  selector: 'radar-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatTooltipModule, FbIconComponent],
  template: `
    <button
      [ngClass]="{
        'button-primary': radarApi.defaultRadar() && app.uiCtrl().radarLayer,
        'button-toolbar':
          !app.featureFlags().radarApi || !app.uiCtrl().radarLayer
      }"
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
