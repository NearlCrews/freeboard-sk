import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardHeaderComponent,
  FbCardContentComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

import { AppFacade } from 'src/app/app.facade';
import type { SKVessel } from 'src/app/modules/skresources/resource-classes';
import { getAisIcon } from 'src/app/modules/icons';

interface AISDisplay {
  length: string | null;
  beam: string | null;
  airHeight: string | null;
  draftMax: string | null;
  draftCurrent: string | null;
}

@Component({
  selector: 'ap-ais-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    MatIconModule,
    FbButtonComponent,
    FbCardComponent,
    FbCardHeaderComponent,
    FbCardContentComponent,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-ais">
      <fb-toolbar style="background-color: transparent">
        <span fbToolbarLeading>
          <mat-icon [svgIcon]="getShipIcon(data.target.type?.id)"></mat-icon>
        </span>
        <span fbToolbarTitle>
          {{ data.title }}
        </span>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            ariaLabel="Close"
            (pressed)="modalRef.dismiss()"
            matTooltip="Close"
            matTooltipPosition="below"
          >
            <mat-icon>keyboard_arrow_down</mat-icon>
          </fb-button>
        </span>
      </fb-toolbar>

      <fb-card>
        <fb-card-header>
          <span fbCardTitle>{{ data.target.name }}</span>
          <span fbCardSubtitle>
            {{ data.target.mmsi }}
            <a
              target="aisinfo"
              [href]="
                'https://www.vesselfinder.com/vessels/details/' +
                data.target.mmsi
              "
            >
              <mat-icon>info</mat-icon>
            </a>
          </span>
          @if (showFlag()) {
            <img
              fbCardHeaderActions
              [src]="flagIcon"
              alt=""
              style="max-width: 40px; max-height: 40px;"
              (error)="imgError()"
            />
          }
        </fb-card-header>
        <fb-card-content>
          <div style="display:flex;flex-direction: column;">
            @if (data.target.type?.name) {
              <div style="display:flex;">
                <div class="key-label">Type:</div>
                <div style="flex: 1 1 auto;">
                  {{ data.target.type?.name }}
                </div>
              </div>
            }
            @if (data.target.flag) {
              <div style="display:flex;">
                <div class="key-label">Flag:</div>
                <div style="flex: 1 1 auto;">
                  {{ data.target.flag }}
                </div>
              </div>
            }
            @if (data.target.port) {
              <div style="display:flex;">
                <div class="key-label">Port:</div>
                <div style="flex: 1 1 auto;">{{ data.target.port }}</div>
              </div>
            }
            @if (data.target.registrations?.['imo']) {
              <div style="display:flex;">
                <div class="key-label">IMO:</div>
                <div style="flex: 1 1 auto;">
                  {{ data.target.registrations?.['imo'] }}
                </div>
              </div>
            }
            @if (data.target.callsignVhf) {
              <div style="display:flex;">
                <div class="key-label">Call sign VHF:</div>
                <div style="flex: 1 1 auto;">{{ data.target.callsignVhf }}</div>
              </div>
            }
            @if (data.target.callsignHf) {
              <div style="display:flex;">
                <div class="key-label">Call sign HF:</div>
                <div style="flex: 1 1 auto;">{{ data.target.callsignHf }}</div>
              </div>
            }
            @if (
              data.target.design['length']?.overall &&
              data.target.design['beam']
            ) {
              <div style="display:flex;">
                <div class="key-label">Dimensions:</div>
                <div style="flex: 1 1 auto;">
                  {{ display.length }} x
                  {{ display.beam }}
                </div>
              </div>
            }
            @if (data.target.design['draft']?.current) {
              <div style="display:flex;">
                <div class="key-label">Draft:</div>
                <div style="flex: 1 1 auto;">
                  {{ display.draftCurrent }}
                </div>
              </div>
            }
            @if (data.target.design['draft']?.maximum) {
              <div style="display:flex;">
                <div class="key-label">Draft (max):</div>
                <div style="flex: 1 1 auto;">
                  {{ display.draftMax }}
                </div>
              </div>
            }
            @if (data.target.design['airHeight']) {
              <div style="display:flex;">
                <div class="key-label">Height:</div>
                <div style="flex: 1 1 auto;">
                  {{ display.airHeight }}
                </div>
              </div>
            }
            @if (data.target.state) {
              <div style="display:flex;">
                <div class="key-label">State:</div>
                <div style="flex: 1 1 auto;">{{ data.target.state }}</div>
              </div>
            }
            @if (data.target.destination?.name; as destName) {
              <div style="display:flex;">
                <div class="key-label">Destination:</div>
                <div style="flex: 1 1 auto;">
                  {{ destName }}
                </div>
              </div>
            }
            @if (data.target.destination?.eta; as destEta) {
              <div style="display:flex;">
                <div class="key-label">ETA:</div>
                <div style="flex: 1 1 auto;">
                  {{ destEta.toLocaleString() }}
                </div>
              </div>
            }
          </div>
        </fb-card-content>
      </fb-card>
    </div>
  `,
  styles: [
    `
      ._ap-ais {
        font-family: arial;
      }
      ._ap-ais .key-label {
        width: 150px;
        font-weight: bold;
      }
    `
  ]
})
export class AISPropertiesModal {
  protected flagIcon = '';
  protected showFlag = signal<boolean>(true);
  protected display: AISDisplay = {
    length: null,
    beam: null,
    airHeight: null,
    draftMax: null,
    draftCurrent: null
  };

  private app = inject(AppFacade);
  protected modalRef = inject(MatBottomSheetRef<AISPropertiesModal>);
  protected data = inject<{
    title: string;
    target: SKVessel;
  }>(MAT_BOTTOM_SHEET_DATA);

  constructor() {
    this.flagIcon = `${this.app.hostDef.url}/signalk/v2/api/resources/flags/mmsi/${this.data.target.mmsi}`;
    const design = this.data.target.design;
    this.display = {
      length: this.app.formatValueForDisplay(design['length']?.overall, 'm', {
        category: 'length'
      }),
      beam: this.app.formatValueForDisplay(design['beam'], 'm', {
        category: 'length'
      }),
      draftMax: this.app.formatValueForDisplay(design['draft']?.maximum, 'm', {
        category: 'length'
      }),
      draftCurrent: this.app.formatValueForDisplay(
        design['draft']?.current,
        'm',
        { category: 'length' }
      ),
      airHeight: this.app.formatValueForDisplay(design['airHeight'], 'm', {
        category: 'length'
      })
    };
  }

  /**
   * Handle flag image error
   */
  imgError() {
    this.showFlag.set(false);
  }

  /**
   * @description Return icon for AIS vessel type id
   * @param id AIS shipType identifier
   * @returns mat-icon svgIcon value
   */
  protected getShipIcon(id: number | null | undefined): string {
    return getAisIcon(id ?? -1).svgIcon ?? '';
  }
}
