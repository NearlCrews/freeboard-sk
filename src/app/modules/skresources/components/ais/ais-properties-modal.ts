import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import {
  FbBottomSheetRef,
  FbButtonComponent,
  FbCardComponent,
  FbCardHeaderComponent,
  FbCardContentComponent,
  FbIconComponent,
  FbToolbarComponent,
  FbTooltipDirective,
  FB_BOTTOM_SHEET_DATA
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
    FbButtonComponent,
    FbCardComponent,
    FbCardHeaderComponent,
    FbCardContentComponent,
    FbIconComponent,
    FbToolbarComponent,
    FbTooltipDirective
  ],
  template: `
    <div class="_ap-ais">
      <fb-toolbar class="bg-transparent">
        <span fbToolbarLeading>
          <fb-icon
            [svgName]="getShipIcon(data.target.type?.id)"
            ariaLabel=""
          ></fb-icon>
        </span>
        <span fbToolbarTitle>
          {{ data.title }}
        </span>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            ariaLabel="Close"
            (pressed)="modalRef.dismiss()"
            fbTooltip="Close"
            fbTooltipPosition="below"
          >
            <fb-icon name="keyboard_arrow_down" ariaLabel=""></fb-icon>
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
              <fb-icon name="info" ariaLabel=""></fb-icon>
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
          <div class="flex flex-col">
            @if (data.target.type?.name) {
              <div class="flex">
                <div class="key-label">Type:</div>
                <div class="flex-auto">
                  {{ data.target.type?.name }}
                </div>
              </div>
            }
            @if (data.target.flag) {
              <div class="flex">
                <div class="key-label">Flag:</div>
                <div class="flex-auto">
                  {{ data.target.flag }}
                </div>
              </div>
            }
            @if (data.target.port) {
              <div class="flex">
                <div class="key-label">Port:</div>
                <div class="flex-auto">{{ data.target.port }}</div>
              </div>
            }
            @if (data.target.registrations?.['imo']) {
              <div class="flex">
                <div class="key-label">IMO:</div>
                <div class="flex-auto">
                  {{ data.target.registrations?.['imo'] }}
                </div>
              </div>
            }
            @if (data.target.callsignVhf) {
              <div class="flex">
                <div class="key-label">Call sign VHF:</div>
                <div class="flex-auto">{{ data.target.callsignVhf }}</div>
              </div>
            }
            @if (data.target.callsignHf) {
              <div class="flex">
                <div class="key-label">Call sign HF:</div>
                <div class="flex-auto">{{ data.target.callsignHf }}</div>
              </div>
            }
            @if (
              data.target.design['length']?.overall &&
              data.target.design['beam']
            ) {
              <div class="flex">
                <div class="key-label">Dimensions:</div>
                <div class="flex-auto">
                  {{ display.length }} x
                  {{ display.beam }}
                </div>
              </div>
            }
            @if (data.target.design['draft']?.current) {
              <div class="flex">
                <div class="key-label">Draft:</div>
                <div class="flex-auto">
                  {{ display.draftCurrent }}
                </div>
              </div>
            }
            @if (data.target.design['draft']?.maximum) {
              <div class="flex">
                <div class="key-label">Draft (max):</div>
                <div class="flex-auto">
                  {{ display.draftMax }}
                </div>
              </div>
            }
            @if (data.target.design['airHeight']) {
              <div class="flex">
                <div class="key-label">Height:</div>
                <div class="flex-auto">
                  {{ display.airHeight }}
                </div>
              </div>
            }
            @if (data.target.state) {
              <div class="flex">
                <div class="key-label">State:</div>
                <div class="flex-auto">{{ data.target.state }}</div>
              </div>
            }
            @if (data.target.destination?.name; as destName) {
              <div class="flex">
                <div class="key-label">Destination:</div>
                <div class="flex-auto">
                  {{ destName }}
                </div>
              </div>
            }
            @if (data.target.destination?.eta; as destEta) {
              <div class="flex">
                <div class="key-label">ETA:</div>
                <div class="flex-auto">
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
  protected modalRef = inject(FbBottomSheetRef) as FbBottomSheetRef<
    unknown,
    AISPropertiesModal
  >;
  protected data = inject<{
    title: string;
    target: SKVessel;
  }>(FB_BOTTOM_SHEET_DATA);

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
   * @returns fb-icon svgName value
   */
  protected getShipIcon(id: number | null | undefined): string {
    return getAisIcon(id ?? -1).svgIcon ?? '';
  }
}
