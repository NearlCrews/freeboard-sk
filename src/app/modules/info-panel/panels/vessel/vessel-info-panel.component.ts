import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { AppFacade } from 'src/app/app.facade';
import { Buddies, SKVessel } from 'src/app/modules';
import { Convert } from 'src/app/lib/convert';
import { GeoUtils } from 'src/app/lib/geoutils';
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
import { CompassComponent } from 'src/app/modules/map/popovers/compass.component';

import type { PanCenter } from '../pan-center';

@Component({
  selector: 'fb-vessel-info-panel',
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
    CompassComponent
  ],
  template: `
    <fb-info-panel-layout [ariaLabel]="ariaLabel()">
      <fb-icon fbInfoPanelIcon name="directions_boat"></fb-icon>
      <ng-container fbInfoPanelTitle>{{ title() }}</ng-container>

      <ng-container fbInfoPanelMeta>
        @if (vessel().mmsi) {
          <span class="pill">MMSI {{ vessel().mmsi }}</span>
        }
        @if (normalisedPosition(); as pos) {
          <span class="pill pos">
            {{ pos[1] | coords: app.config.units.positionFormat : true }},
            {{ pos[0] | coords: app.config.units.positionFormat }}
          </span>
        }
        @if (cogSogPill(); as cs) {
          <span class="pill">{{ cs }}</span>
        }
        @if (isSelf() && vessel().anchor.position) {
          <span class="pill warn">Anchored</span>
        }
        @if (vessel().buddy) {
          <span class="pill group"><span class="dot"></span>Buddy</span>
        }
      </ng-container>

      <ng-container fbInfoPanelActions>
        <div class="action-grid">
          <fb-button
            variant="secondary"
            size="sm"
            ariaLabel="Show vessel properties"
            (pressed)="handleInfo()"
          >
            Info
          </fb-button>
          <fb-button
            variant="secondary"
            size="sm"
            ariaLabel="Center map on vessel"
            [disabled]="!normalisedPosition()"
            (pressed)="handlePanTo()"
          >
            Centre
          </fb-button>
          @if (isActive()) {
            <fb-button
              variant="secondary"
              size="sm"
              ariaLabel="Add waypoint at vessel location"
              [disabled]="!vessel().position"
              (pressed)="handleMarkPosition()"
            >
              Mark Waypoint
            </fb-button>
          }
          @if (!isSelf()) {
            <fb-button
              variant="secondary"
              size="sm"
              [ariaLabel]="isFlagged() ? 'Clear flag' : 'Flag vessel'"
              (pressed)="toggleFlag()"
            >
              {{ isFlagged() ? 'Clear Flag' : 'Flag' }}
            </fb-button>
            @if (app.featureFlags().buddyList) {
              <fb-button
                variant="secondary"
                size="sm"
                [ariaLabel]="vessel().buddy ? 'Remove buddy' : 'Add as buddy'"
                (pressed)="toggleBuddy()"
              >
                {{ vessel().buddy ? 'Remove Buddy' : 'Add Buddy' }}
              </fb-button>
            }
            @if (isActive()) {
              <fb-button
                variant="secondary"
                size="sm"
                ariaLabel="Clear vessel focus"
                (pressed)="focusVessel(false)"
              >
                Clear Focus
              </fb-button>
            } @else {
              <fb-button
                variant="secondary"
                size="sm"
                ariaLabel="Focus vessel"
                (pressed)="focusVessel(true)"
              >
                Focus
              </fb-button>
            }
          }
        </div>
      </ng-container>

      <div fbInfoPanelBody class="ip-vessel">
        @if (vessel().callsignVhf) {
          <div class="row">
            <span class="label">Callsign (VHF)</span>
            <span class="value">{{ vessel().callsignVhf }}</span>
          </div>
        } @else if (vessel().callsignHf) {
          <div class="row">
            <span class="label">Callsign (HF)</span>
            <span class="value">{{ vessel().callsignHf }}</span>
          </div>
        }
        @if (normalisedPosition(); as pos) {
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
        @if (positionTimestamp()) {
          <div class="row">
            <span class="label">Last Position</span>
            <span class="value">{{ positionTimestamp() }}</span>
          </div>
        }
        @if (!isSelf()) {
          @if (vessel().distanceToSelf !== null) {
            <div class="row">
              <span class="label">Range</span>
              <span class="value">{{ distToSelf() }}</span>
            </div>
          }
          @if (vessel().closestApproach) {
            <div class="row">
              <span class="label">CPA</span>
              <span class="value">{{ cpa() || '--' }}</span>
            </div>
            <div class="row">
              <span class="label">TCPA</span>
              <span class="value">{{ tcpa() || '--' }}</span>
            </div>
          }
        }
        <div class="row">
          <span class="label">Last Update</span>
          <span class="value">{{ timeLastUpdate() }} {{ timeAgo() }}</span>
        </div>

        <div class="compass-row">
          <div class="compass-wrap">
            <ap-compass
              [heading]="Convert.radiansToDegrees(vessel().orientation)"
              [windtrue]="windTrueDeg()"
              [windapparent]="windApparentDeg()"
              [speed]="speedDisplay()"
              [speedunits]="app.formattedSpeedUnits"
            ></ap-compass>
          </div>
          <div class="wind-block">
            <div class="wind-line wind-true">
              <span class="wind-key"
                >Wind ({{ useMagnetic() ? 'M' : 'T' }})</span
              >
              <span class="wind-val"
                >{{ formattedTws() }} {{ app.formattedSpeedUnits }}</span
              >
            </div>
            <div class="wind-line wind-apparent">
              <span class="wind-key">Wind (A)</span>
              <span class="wind-val"
                >{{ formattedAws() }} {{ app.formattedSpeedUnits }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </fb-info-panel-layout>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .ip-vessel .row {
      display: flex;
      justify-content: space-between;
      gap: var(--space-md);
      padding: var(--space-xs) 0;
      border-bottom: 1px solid var(--color-border);
    }

    .ip-vessel .row:last-of-type {
      border-bottom: 0;
    }

    .ip-vessel .label {
      font-weight: var(--font-weight-bold);
      color: var(--color-text-muted);
    }

    .ip-vessel .value {
      text-align: right;
      color: var(--color-text);
    }

    .ip-vessel .value.mono {
      font-family: var(--font-family-mono);
      letter-spacing: 0.02em;
    }

    .compass-row {
      display: flex;
      gap: var(--space-md);
      align-items: flex-start;
      margin-top: var(--space-md);
    }

    .compass-wrap {
      width: 140px;
      flex-shrink: 0;
    }

    .wind-block {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .wind-line {
      display: flex;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: var(--space-xs) var(--space-sm);
      border-right: 10px solid var(--color-border);
      border-radius: var(--radius-xs);
      background: var(--color-surface-raised);
    }

    .wind-line.wind-true {
      border-right-color: var(--color-warning);
    }

    .wind-line.wind-apparent {
      border-right-color: var(--color-success, var(--color-primary));
    }

    .wind-key {
      font-weight: var(--font-weight-bold);
      color: var(--color-text-muted);
    }

    .wind-val {
      color: var(--color-text);
    }
  `
})
export class VesselInfoPanelComponent {
  readonly vessel = input.required<SKVessel>();
  readonly useMagnetic = input<boolean>(false);
  readonly isActive = input<boolean>(false);
  readonly isSelf = input<boolean>(false);

  readonly info = output<void>();
  readonly focused = output<boolean>();
  readonly markPosition = output<Position>();
  readonly panTo = output<PanCenter>();

  protected readonly app = inject(AppFacade);
  protected readonly Convert = Convert;
  private readonly buddies = inject(Buddies);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly title = computed<string>(() => {
    const v = this.vessel();
    return v.name || v.mmsi || v.callsignVhf || v.callsignHf || 'Vessel';
  });

  protected readonly ariaLabel = computed<string>(
    () => `Vessel ${this.title()}`
  );

  protected readonly normalisedPosition = computed<Position | null>(() => {
    const pos = this.vessel().position;
    if (!pos) return null;
    return GeoUtils.normaliseCoords([pos[0], pos[1]]);
  });

  protected readonly positionTimestamp = computed<string>(() => {
    const ts = this.vessel().positionTimestamp;
    if (!ts) return '';
    const pts = new Date(ts);
    return `${pts.getHours()}:${('00' + pts.getMinutes()).slice(-2)}`;
  });

  protected readonly timeLastUpdate = computed<string>(() => {
    const lu = this.vessel().lastUpdated;
    return `${lu.getHours()}:${('00' + lu.getMinutes()).slice(-2)}`;
  });

  protected readonly timeAgo = computed<string>(() => {
    const td = (Date.now() - this.vessel().lastUpdated.valueOf()) / 1000;
    return td < 60 ? '' : `(${Math.floor(td / 60)} min ago)`;
  });

  protected readonly distToSelf = computed<string>(() => {
    const v = this.vessel();
    return this.app.formatValueForDisplay(v.distanceToSelf ?? 0, 'm');
  });

  protected readonly cpa = computed<string>(() => {
    const ca = this.vessel().closestApproach;
    if (!ca || typeof ca.distance !== 'number') return '';
    return this.app.formatValueForDisplay(ca.distance, 'm');
  });

  protected readonly tcpa = computed<string>(() => {
    const ca = this.vessel().closestApproach;
    if (!ca || typeof ca.timeTo !== 'number') return '';
    return this.app.formatValueForDisplay(ca.timeTo, 's');
  });

  protected readonly windTrueDeg = computed<number | undefined>(() => {
    const w = this.vessel().wind.direction;
    return w === null ? undefined : Convert.radiansToDegrees(w);
  });

  protected readonly windApparentDeg = computed<number | undefined>(() => {
    const a = this.vessel().wind.awa;
    return a === null ? undefined : Convert.radiansToDegrees(a);
  });

  protected readonly speedDisplay = computed<number | undefined>(() => {
    const sog = this.vessel().sog;
    if (sog === null) return undefined;
    const out = this.app.formatSpeed(sog);
    return typeof out === 'number' ? out : Number.parseFloat(out);
  });

  protected readonly formattedTws = computed<string>(() => {
    const tws = this.vessel().wind.tws;
    return this.app.formatSpeed(tws, true) as string;
  });

  protected readonly formattedAws = computed<string>(() => {
    const aws = this.vessel().wind.aws;
    return this.app.formatSpeed(aws, true) as string;
  });

  protected readonly cogSogPill = computed<string>(() => {
    const v = this.vessel();
    const parts: string[] = [];
    if (v.cog !== null) {
      parts.push(
        `COG ${Math.round(Convert.radiansToDegrees(v.cog))}°${this.useMagnetic() ? 'M' : 'T'}`
      );
    }
    if (v.sog !== null) {
      parts.push(
        `SOG ${this.app.formatSpeed(v.sog, true)} ${this.app.formattedSpeedUnits}`
      );
    }
    return parts.join(' · ');
  });

  protected readonly isFlagged = computed<boolean>(() =>
    this.app.data.vessels.flagged.includes(this.vessel().id)
  );

  handleInfo(): void {
    this.info.emit();
  }

  handleMarkPosition(): void {
    const pos = this.vessel().position;
    if (pos) this.markPosition.emit(pos);
  }

  handlePanTo(): void {
    const pos = this.normalisedPosition();
    if (pos) this.panTo.emit({ center: pos });
  }

  focusVessel(setFocus: boolean): void {
    this.removeFlag();
    this.focused.emit(setFocus);
  }

  toggleFlag(): void {
    if (this.isFlagged()) {
      this.removeFlag();
    } else {
      const id = this.vessel().id;
      if (!this.app.data.vessels.flagged.includes(id)) {
        this.app.data.vessels.flagged = [id].concat(
          this.app.data.vessels.flagged
        );
      }
    }
  }

  toggleBuddy(): void {
    const v = this.vessel();
    const urn = v.id.split('.').slice(1).join('.');
    if (v.buddy) {
      this.buddies
        .remove(urn)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () =>
            this.app.showMessage('Buddy successfully removed.', false, 3000),
          error: (_err: HttpErrorResponse) =>
            this.app.showMessage('Error removing buddy!', false, 3000)
        });
    } else {
      const name = v.name || v.mmsi || v.callsignVhf || urn.slice(-5);
      this.buddies
        .add(urn, name)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () =>
            this.app.showMessage(`Buddy added (${name})`, false, 3000),
          error: (_err: HttpErrorResponse) =>
            this.app.showMessage(`Error adding buddy!(${name})`, false, 5000)
        });
    }
  }

  private removeFlag(): void {
    const id = this.vessel().id;
    const flagged = this.app.data.vessels.flagged;
    const i = flagged.indexOf(id);
    if (i >= 0) {
      flagged.splice(i, 1);
      this.app.data.vessels.flagged = ([] as string[]).concat(flagged);
    }
  }
}
