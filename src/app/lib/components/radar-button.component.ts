import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input
} from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FbFabComponent } from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import { RadarAPIService } from 'src/app/modules/radar/radar-api.service';

@Component({
  selector: 'radar-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTooltipModule, FbFabComponent],
  template: `
    <fb-fab
      variant="primary"
      [svgName]="iconName()"
      ariaLabel="Toggle radar overlay"
      matTooltip="Radar Overlay"
      matTooltipPosition="above"
      [disabled]="!active()"
      (pressed)="handleClick()"
    ></fb-fab>
  `,
  styles: []
})
export class RadarButtonComponent {
  protected active = input<boolean>(false);

  protected app = inject(AppFacade);
  protected radarApi = inject(RadarAPIService);

  protected readonly iconName = computed(() =>
    this.app.uiCtrl().radarLayer ? 'chart-radar-overlay-iec' : 'radar-iec'
  );

  constructor() {}

  handleClick() {
    this.app.uiCtrl.update((current) => {
      const show = !current.radarLayer;
      return Object.assign({}, current, { radarLayer: show });
    });
  }
}
