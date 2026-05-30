import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FbBottomSheetRef,
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbIconComponent,
  FbToolbarComponent,
  FbTooltipDirective,
  FB_BOTTOM_SHEET_DATA
} from 'src/app/design-system/primitives';

import { SignalKClient } from 'src/lib/signalk-client';
import type { SKAircraft } from 'src/app/modules/skresources/resource-classes';
import { SignalKDetailsComponent } from '../../components/signalk-details.component';

@Component({
  selector: 'ap-aircraft-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbCardComponent,
    FbCardContentComponent,
    FbIconComponent,
    FbToolbarComponent,
    FbTooltipDirective,
    SignalKDetailsComponent
  ],
  template: `
    <div class="_ap-aircraft">
      <fb-toolbar class="bg-transparent">
        <span fbToolbarLeading>
          <fb-icon name="airplanemode_active" ariaLabel=""></fb-icon>
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
        <fb-card-content>
          <div class="flex flex-col">
            <div class="flex">
              <div class="key-label">Name:</div>
              <div class="flex-auto">{{ data.target.name }}</div>
            </div>
            <div class="flex">
              <div class="key-label">MMSI:</div>
              <div class="flex-auto">{{ data.target.mmsi }}</div>
            </div>
            <div class="flex">
              <div class="key-label">Call sign VHF:</div>
              <div class="flex-auto">{{ data.target.callsignVhf }}</div>
            </div>
            <div class="flex">
              <div class="key-label">Call sign HF:</div>
              <div class="flex-auto">{{ data.target.callsignHf }}</div>
            </div>
            <fb-button variant="secondary" (pressed)="toggleProperties()">
              <span>Show {{ showProperties ? 'Less' : 'More' }}</span>
              <fb-icon
                [name]="
                  showProperties
                    ? 'keyboard_arrow_down'
                    : 'keyboard_arrow_right'
                "
                ariaLabel=""
              ></fb-icon>
            </fb-button>
            @if (showProperties) {
              <signalk-details-list
                [details]="properties"
              ></signalk-details-list>
            }
          </div>
        </fb-card-content>
      </fb-card>
    </div>
  `,
  styles: [
    `
      ._ap-aircraft {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-aircraft .key-label {
        width: 150px;
        font-weight: bold;
      }
    `
  ]
})
export class AircraftPropertiesModal implements OnInit {
  protected showProperties = true;
  protected properties: Record<string, string | number | null> = {};

  private sk = inject(SignalKClient);
  protected modalRef = inject(FbBottomSheetRef) as FbBottomSheetRef<
    unknown,
    AircraftPropertiesModal
  >;
  protected data = inject<{
    title: string;
    target: SKAircraft;
    id: string;
    icon: string;
  }>(FB_BOTTOM_SHEET_DATA);
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.getAircraftInfo();
  }

  // fetch object information
  private getAircraftInfo() {
    if (!this.data.id) {
      return;
    }
    const path = this.data.id.split('.').join('/');

    this.sk.api
      .get(path)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v: unknown) => {
        this.properties = this.parseAircraft(v);
      });
  }

  private parseAircraft(data: unknown): Record<string, string | number | null> {
    const res: Record<string, string | number | null> = {};
    const d = data as
      | { navigation?: { position?: { value?: string | number | null } } }
      | null
      | undefined;
    if (d?.navigation?.position) {
      res['navigation.position'] = d.navigation.position.value ?? null;
    }
    return res;
  }

  toggleProperties() {
    this.showProperties = !this.showProperties;
  }
}
