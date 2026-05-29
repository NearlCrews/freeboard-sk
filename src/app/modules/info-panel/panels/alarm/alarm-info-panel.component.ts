import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output
} from '@angular/core';

import { AppFacade } from 'src/app/app.facade';
import { AlertData } from 'src/app/modules/alarms';
import { CoordsPipe } from 'src/app/lib/pipes';
import type { Position } from 'src/app/types';
import { ALARM_STATE } from 'src/app/types/stream';

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

interface AlarmPositionProp {
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'fb-alarm-info-panel',
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
      <fb-icon fbInfoPanelIcon name="warning"></fb-icon>
      <ng-container fbInfoPanelTitle>{{ title() }}</ng-container>

      <ng-container fbInfoPanelMeta>
        <span [class]="statePillClass()">{{ alarm().priority }}</span>
        @if (alarm().type) {
          <span class="pill">{{ alarm().type }}</span>
        }
        @if (positionProp(); as p) {
          <span class="pill pos">
            {{ p.latitude | coords: app.config.units.positionFormat : true }},
            {{ p.longitude | coords: app.config.units.positionFormat }}
          </span>
        }
        @if (alarm().acknowledged) {
          <span class="pill group"><span class="dot"></span>Acknowledged</span>
        }
        @if (alarm().silenced) {
          <span class="pill group"><span class="dot"></span>Silenced</span>
        }
      </ng-container>

      <ng-container fbInfoPanelActions>
        <div [class]="actionGridClass()">
          @if (alarm().canSilence !== false) {
            <fb-button
              variant="secondary"
              size="sm"
              ariaLabel="Silence alarm"
              [disabled]="alarm().silenced"
              (pressed)="handleSilence()"
            >
              Silence
            </fb-button>
          }
          @if (alarm().canAcknowledge !== false) {
            <fb-button
              variant="secondary"
              size="sm"
              ariaLabel="Acknowledge alarm"
              [disabled]="alarm().acknowledged"
              (pressed)="handleAcknowledge()"
            >
              Acknowledge
            </fb-button>
          }
          @if (alarm().canCancel !== false) {
            <fb-button
              variant="danger"
              size="sm"
              ariaLabel="Resolve alarm"
              (pressed)="handleResolve()"
            >
              Resolve
            </fb-button>
          }
          @if (positionProp()) {
            <fb-button
              variant="secondary"
              size="sm"
              ariaLabel="Center map on alarm location"
              (pressed)="handlePanTo()"
            >
              Centre
            </fb-button>
          }
        </div>
      </ng-container>

      <div fbInfoPanelBody class="ip-alarm">
        <div class="row block">
          <span class="label">Message</span>
          <span class="value">{{ alarm().message }}</span>
        </div>
        <div class="row">
          <span class="label">Source</span>
          <span class="value mono">{{ alarm().path }}</span>
        </div>
        @if (alarm().type) {
          <div class="row">
            <span class="label">Type</span>
            <span class="value">{{ alarm().type }}</span>
          </div>
        }
        <div class="row">
          <span class="label">Severity</span>
          <span class="value">{{ alarm().priority }}</span>
        </div>
        @if (positionProp(); as p) {
          <div class="row">
            <span class="label">Latitude</span>
            <span class="value mono">{{
              p.latitude | coords: app.config.units.positionFormat : true
            }}</span>
          </div>
          <div class="row">
            <span class="label">Longitude</span>
            <span class="value mono">{{
              p.longitude | coords: app.config.units.positionFormat
            }}</span>
          </div>
        }
        @if (createdAtDisplay(); as ts) {
          <div class="row">
            <span class="label">Created</span>
            <span class="value">{{ ts }}</span>
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

    .ip-alarm .row {
      display: flex;
      justify-content: space-between;
      gap: var(--space-md);
      padding: var(--space-xs) 0;
      border-bottom: 1px solid var(--color-border);
    }

    .ip-alarm .row.block {
      flex-direction: column;
      align-items: flex-start;
    }

    .ip-alarm .row:last-of-type {
      border-bottom: 0;
    }

    .ip-alarm .label {
      font-weight: var(--font-weight-bold);
      color: var(--color-text-muted);
    }

    .ip-alarm .value {
      text-align: right;
      color: var(--color-text);
      overflow-wrap: anywhere;
    }

    .ip-alarm .row.block .value {
      text-align: left;
    }

    .ip-alarm .value.mono {
      font-family: var(--font-family-mono);
      letter-spacing: 0.02em;
    }
  `
})
export class AlarmInfoPanelComponent {
  readonly alarm = input.required<AlertData>();

  readonly silence = output<void>();
  readonly acknowledge = output<void>();
  readonly resolve = output<void>();
  readonly panTo = output<PanCenter>();

  protected readonly app = inject(AppFacade);

  protected readonly title = computed<string>(() => {
    const a = this.alarm();
    return a.message || a.path || 'Alarm';
  });

  protected readonly ariaLabel = computed<string>(
    () => `Alarm ${this.title()}`
  );

  protected readonly statePillClass = computed<string>(() => {
    const p = this.alarm().priority;
    if (p === ALARM_STATE.alarm || p === ALARM_STATE.emergency) {
      return 'pill alarm';
    }
    if (p === ALARM_STATE.warn) return 'pill warn';
    return 'pill';
  });

  protected readonly positionProp = computed<AlarmPositionProp | null>(() => {
    const raw = this.alarm().properties?.['position'];
    if (
      raw &&
      typeof raw === 'object' &&
      typeof (raw as AlarmPositionProp).latitude === 'number' &&
      typeof (raw as AlarmPositionProp).longitude === 'number'
    ) {
      return raw as AlarmPositionProp;
    }
    return null;
  });

  protected readonly actionGridClass = computed<string>(() => {
    const a = this.alarm();
    let count = 0;
    if (a.canSilence !== false) count++;
    if (a.canAcknowledge !== false) count++;
    if (a.canCancel !== false) count++;
    if (this.positionProp()) count++;
    return count >= 3 ? 'action-grid-3' : 'action-grid';
  });

  protected readonly createdAtDisplay = computed<string>(() => {
    const ts = this.alarm().createdAt;
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getHours()}:${('00' + d.getMinutes()).slice(-2)}`;
  });

  handleSilence(): void {
    this.silence.emit();
  }

  handleAcknowledge(): void {
    this.acknowledge.emit();
  }

  handleResolve(): void {
    this.resolve.emit();
  }

  handlePanTo(): void {
    const p = this.positionProp();
    if (p) this.panTo.emit({ center: [p.longitude, p.latitude] });
  }
}
