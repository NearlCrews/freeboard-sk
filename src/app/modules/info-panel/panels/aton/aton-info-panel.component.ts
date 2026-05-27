import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output
} from '@angular/core';

import { AppFacade } from 'src/app/app.facade';
import { SKAtoN, SKMeteo } from 'src/app/modules';
import { Convert } from 'src/app/lib/convert';
import { CoordsPipe } from 'src/app/lib/pipes';
import { Position } from 'src/app/types';

import {
  FbInfoPanelLayoutComponent,
  FbInfoPanelIconDirective,
  FbInfoPanelTitleDirective,
  FbInfoPanelMetaDirective,
  FbInfoPanelActionsDirective,
  FbInfoPanelBodyDirective
} from 'src/app/modules/info-panel/layout';
import { FbButtonComponent } from 'src/app/design-system/primitives/button/button.component';
import { FbIconComponent } from 'src/app/design-system/primitives/icon/icon.component';
import { NorthUpCompassComponent } from 'src/app/modules/map/popovers/compass.component';

interface PanCenter {
  center: Position;
  zoomLevel?: number;
}

@Component({
  selector: 'fb-aton-info-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CoordsPipe,
    FbInfoPanelLayoutComponent,
    FbInfoPanelIconDirective,
    FbInfoPanelTitleDirective,
    FbInfoPanelMetaDirective,
    FbInfoPanelActionsDirective,
    FbInfoPanelBodyDirective,
    FbButtonComponent,
    FbIconComponent,
    NorthUpCompassComponent
  ],
  template: `
    <fb-info-panel-layout [ariaLabel]="ariaLabel()">
      <fb-icon fbInfoPanelIcon [name]="iconName()"></fb-icon>
      <ng-container fbInfoPanelTitle>{{ title() }}</ng-container>

      <ng-container fbInfoPanelMeta>
        @if (target().type?.name) {
          <span class="pill">{{ target().type.name }}</span>
        }
        @if (target().mmsi) {
          <span class="pill">MMSI {{ target().mmsi }}</span>
        }
        @if (target().position; as pos) {
          <span class="pill pos">
            {{ pos[1] | coords: app.config.units.positionFormat : true }},
            {{ pos[0] | coords: app.config.units.positionFormat }}
          </span>
        }
        @if (isMeteo()) {
          <span class="pill group"><span class="dot"></span>Weather</span>
        }
      </ng-container>

      <ng-container fbInfoPanelActions>
        <div class="action-grid">
          <fb-button
            variant="secondary"
            size="sm"
            ariaLabel="Show AtoN properties"
            (pressed)="handleInfo()"
          >
            Info
          </fb-button>
          <fb-button
            variant="secondary"
            size="sm"
            ariaLabel="Center map on AtoN"
            [disabled]="!target().position"
            (pressed)="handlePanTo()"
          >
            Centre
          </fb-button>
        </div>
      </ng-container>

      <div fbInfoPanelBody class="ip-aton">
        @if (target().type?.name) {
          <div class="row">
            <span class="label">Type</span>
            <span class="value">{{ target().type.name }}</span>
          </div>
        }
        @if (target().position; as pos) {
          <div class="row">
            <span class="label">Latitude</span>
            <span class="value mono">{{
              pos[1] | coords: app.config.units.positionFormat : true
            }}</span>
          </div>
          <div class="row">
            <span class="label">Longitude</span>
            <span class="value mono">{{
              pos[0] | coords: app.config.units.positionFormat
            }}</span>
          </div>
        }
        <div class="row">
          <span class="label">Last Update</span>
          <span class="value">{{ timeLastUpdate() }} {{ timeAgo() }}</span>
        </div>
        @if (meteoTemperature(); as t) {
          <div class="row">
            <span class="label">Temperature</span>
            <span class="value">{{ t }}</span>
          </div>
        }
        @if (meteoWind(); as wind) {
          <div class="wind-row">
            <span class="label">Wind</span>
            <div class="compass-wrap">
              <ap-compass-northup
                [heading]="wind.heading"
                [speed]="wind.speed"
                [label]="app.formattedSpeedUnits"
                [windtrue]="true"
              ></ap-compass-northup>
            </div>
          </div>
        }
      </div>
    </fb-info-panel-layout>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .ip-aton .row {
      display: flex;
      justify-content: space-between;
      gap: var(--space-md);
      padding: var(--space-xs) 0;
      border-bottom: 1px solid var(--color-border);
    }

    .ip-aton .row:last-of-type {
      border-bottom: 0;
    }

    .ip-aton .label {
      font-weight: var(--font-weight-bold);
      color: var(--color-text-muted);
    }

    .ip-aton .value {
      text-align: right;
      color: var(--color-text);
    }

    .ip-aton .value.mono {
      font-family: var(--font-family-mono);
      letter-spacing: 0.02em;
    }

    .wind-row {
      display: flex;
      gap: var(--space-md);
      align-items: center;
      padding: var(--space-sm) 0;
    }

    .wind-row .compass-wrap {
      width: 150px;
    }
  `
})
export class AtonInfoPanelComponent {
  readonly target = input.required<SKAtoN>();

  readonly info = output<void>();
  readonly panTo = output<PanCenter>();

  protected readonly app = inject(AppFacade);

  protected readonly title = computed<string>(() => {
    const a = this.target();
    return a.name || a.mmsi || a.type?.name || 'AtoN';
  });

  protected readonly ariaLabel = computed<string>(() => `AtoN ${this.title()}`);

  protected readonly isMeteo = computed<boolean>(() =>
    this.target().id.includes('meteo')
  );

  protected readonly iconName = computed<string>(() =>
    this.isMeteo() ? 'cloud' : 'beenhere'
  );

  private readonly meteo = computed<SKMeteo | null>(() => {
    const t = this.target();
    return t instanceof SKMeteo ? t : null;
  });

  protected readonly meteoTemperature = computed<string>(() => {
    const m = this.meteo();
    if (!m || m.temperature === null) return '';
    return this.app.formatValueForDisplay(m.temperature, 'K');
  });

  protected readonly meteoWind = computed<{
    heading: number;
    speed: number;
  } | null>(() => {
    const m = this.meteo();
    if (!m || m.tws === null || m.twd === null) return null;
    const speed = this.app.formatSpeed(m.tws);
    return {
      heading: Convert.radiansToDegrees(m.twd),
      speed: typeof speed === 'number' ? speed : Number.parseFloat(speed)
    };
  });

  protected readonly timeLastUpdate = computed<string>(() => {
    const lu = this.target().lastUpdated;
    return `${lu.getHours()}:${('00' + lu.getMinutes()).slice(-2)}`;
  });

  protected readonly timeAgo = computed<string>(() => {
    const td = (Date.now() - this.target().lastUpdated.valueOf()) / 1000;
    return td < 60 ? '' : `(${Math.floor(td / 60)} min ago)`;
  });

  handleInfo(): void {
    this.info.emit();
  }

  handlePanTo(): void {
    const pos = this.target().position;
    if (pos) this.panTo.emit({ center: pos });
  }
}
