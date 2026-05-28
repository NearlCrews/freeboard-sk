import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

import {
  FbCardComponent,
  FbCardContentComponent,
  FbIconComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

import { SignalKClient } from 'src/lib/signalk-client';
import type { SKAircraft } from 'src/app/modules/skresources/resource-classes';
import { SignalKDetailsComponent } from '../../components/signalk-details.component';

@Component({
  selector: 'ap-aircraft-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    MatButtonModule,
    FbCardComponent,
    FbCardContentComponent,
    FbIconComponent,
    FbToolbarComponent,
    SignalKDetailsComponent
  ],
  template: `
    <div class="_ap-aircraft">
      <fb-toolbar style="background-color: transparent">
        <span fbToolbarLeading>
          <fb-icon name="airplanemode_active" ariaLabel=""></fb-icon>
        </span>
        <span fbToolbarTitle>
          {{ data.title }}
        </span>
        <span fbToolbarActions>
          <button
            mat-icon-button
            (click)="modalRef.dismiss()"
            matTooltip="Close"
            matTooltipPosition="below"
          >
            <fb-icon name="keyboard_arrow_down" ariaLabel=""></fb-icon>
          </button>
        </span>
      </fb-toolbar>

      <fb-card>
        <fb-card-content>
          <div style="display:flex;flex-direction: column;">
            <div style="display:flex;">
              <div class="key-label">Name:</div>
              <div style="flex: 1 1 auto;">{{ data.target.name }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">MMSI:</div>
              <div style="flex: 1 1 auto;">{{ data.target.mmsi }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">Call sign VHF:</div>
              <div style="flex: 1 1 auto;">{{ data.target.callsignVhf }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">Call sign HF:</div>
              <div style="flex: 1 1 auto;">{{ data.target.callsignHf }}</div>
            </div>
            <button mat-stroked-button (click)="toggleProperties()">
              <span>Show {{ showProperties ? 'Less' : 'More' }}</span>
              <fb-icon
                [name]="
                  showProperties
                    ? 'keyboard_arrow_down'
                    : 'keyboard_arrow_right'
                "
                ariaLabel=""
              ></fb-icon>
            </button>
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
  protected modalRef = inject(MatBottomSheetRef<AircraftPropertiesModal>);
  protected data = inject<{
    title: string;
    target: SKAircraft;
    id: string;
    icon: string;
  }>(MAT_BOTTOM_SHEET_DATA);
  private destroyRef = inject(DestroyRef);

  constructor() {}

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
