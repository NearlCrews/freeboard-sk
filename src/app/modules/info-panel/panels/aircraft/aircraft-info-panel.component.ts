import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output
} from '@angular/core';

import { AppFacade } from 'src/app/app.facade';
import { SKAircraft } from 'src/app/modules';
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
} from 'src/app/modules/info-panel/layout/info-panel-layout.component';
import { FbButtonComponent } from 'src/app/design-system/primitives/button/button.component';
import { FbIconComponent } from 'src/app/design-system/primitives/icon/icon.component';

interface PanCenter {
  center: Position;
  zoomLevel?: number;
}

@Component({
  selector: 'fb-aircraft-info-panel',
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
    FbIconComponent
  ],
  template: `
    <fb-info-panel-layout [ariaLabel]="ariaLabel()">
      <fb-icon fbInfoPanelIcon name="flight"></fb-icon>
      <ng-container fbInfoPanelTitle>{{ title() }}</ng-container>

      <ng-container fbInfoPanelMeta>
        @if (target().mmsi) {
          <span class="pill">MMSI {{ target().mmsi }}</span>
        }
        @if (target().callsignVhf) {
          <span class="pill">VHF {{ target().callsignVhf }}</span>
        }
        @if (target().callsignHf) {
          <span class="pill">HF {{ target().callsignHf }}</span>
        }
        @if (target().position; as pos) {
          <span class="pill pos">
            {{ pos[1] | coords: app.config.units.positionFormat : true }},
            {{ pos[0] | coords: app.config.units.positionFormat }}
          </span>
        }
        @if (headingPill(); as h) {
          <span class="pill">{{ h }}</span>
        }
      </ng-container>

      <ng-container fbInfoPanelActions>
        <div class="action-grid">
          <fb-button
            variant="secondary"
            size="sm"
            ariaLabel="Show aircraft properties"
            (pressed)="handleInfo()"
          >
            Info
          </fb-button>
          <fb-button
            variant="secondary"
            size="sm"
            ariaLabel="Center map on aircraft"
            [disabled]="!target().position"
            (pressed)="handlePanTo()"
          >
            Centre
          </fb-button>
        </div>
      </ng-container>

      <div fbInfoPanelBody class="ip-aircraft">
        @if (target().name) {
          <div class="row">
            <span class="label">Name</span>
            <span class="value">{{ target().name }}</span>
          </div>
        }
        @if (target().callsignVhf) {
          <div class="row">
            <span class="label">Callsign (VHF)</span>
            <span class="value">{{ target().callsignVhf }}</span>
          </div>
        }
        @if (target().callsignHf) {
          <div class="row">
            <span class="label">Callsign (HF)</span>
            <span class="value">{{ target().callsignHf }}</span>
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
          @if (altitude(); as alt) {
            <div class="row">
              <span class="label">Altitude</span>
              <span class="value">{{ alt }} m</span>
            </div>
          }
        }
        @if (sogDisplay(); as s) {
          <div class="row">
            <span class="label">Speed</span>
            <span class="value">{{ s }}</span>
          </div>
        }
        @if (cogDisplay(); as c) {
          <div class="row">
            <span class="label">Course</span>
            <span class="value">{{ c }}</span>
          </div>
        }
        <div class="row">
          <span class="label">Last Update</span>
          <span class="value">{{ timeLastUpdate() }} {{ timeAgo() }}</span>
        </div>
      </div>
    </fb-info-panel-layout>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .ip-aircraft .row {
      display: flex;
      justify-content: space-between;
      gap: var(--space-md);
      padding: var(--space-xs) 0;
      border-bottom: 1px solid var(--color-border);
    }

    .ip-aircraft .row:last-of-type {
      border-bottom: 0;
    }

    .ip-aircraft .label {
      font-weight: var(--font-weight-bold);
      color: var(--color-text-muted);
    }

    .ip-aircraft .value {
      text-align: right;
      color: var(--color-text);
    }

    .ip-aircraft .value.mono {
      font-family: var(--font-family-mono);
      letter-spacing: 0.02em;
    }
  `
})
export class AircraftInfoPanelComponent {
  readonly target = input.required<SKAircraft>();

  readonly info = output<void>();
  readonly panTo = output<PanCenter>();

  protected readonly app = inject(AppFacade);

  protected readonly title = computed<string>(() => {
    const a = this.target();
    return a.name || a.callsignVhf || a.callsignHf || a.mmsi || 'Aircraft';
  });

  protected readonly ariaLabel = computed<string>(
    () => `Aircraft ${this.title()}`
  );

  protected readonly altitude = computed<string>(() => {
    const pos = this.target().position;
    if (!pos || pos[2] === undefined || pos[2] === null) return '';
    return String(Math.round(pos[2]));
  });

  protected readonly sogDisplay = computed<string>(() => {
    const sog = this.target().sog;
    if (sog === undefined || sog === null) return '';
    return `${this.app.formatSpeed(sog, true)} ${this.app.formattedSpeedUnits}`;
  });

  protected readonly cogDisplay = computed<string>(() => {
    const a = this.target();
    if (a.orientation === undefined || a.orientation === null) return '';
    return `${Math.round(Convert.radiansToDegrees(a.orientation))}°`;
  });

  protected readonly headingPill = computed<string>(() => {
    const parts: string[] = [];
    const c = this.cogDisplay();
    if (c) parts.push(`HDG ${c}`);
    const s = this.sogDisplay();
    if (s) parts.push(s);
    return parts.join(' · ');
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
