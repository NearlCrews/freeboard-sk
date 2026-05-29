import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { SignalKDetailsComponent } from '../components/signalk-details.component';
import { Feature } from 'geojson';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbIconComponent,
  FbToolbarComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';

@Component({
  selector: 'ap-feature-modal',
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
    <div class="_ap-feature">
      <fb-toolbar class="bg-transparent">
        <span fbToolbarLeading
          ><fb-icon name="info" ariaLabel=""></fb-icon
        ></span>
        <span fbToolbarTitle> Feature Properties </span>
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

      @for (feature of display; track feature; let i = $index) {
        @if (currentPage - 1 === i) {
          <div class="flex">
            @if (data.length > 1) {
              <div style="min-width:50px;text-align:left;padding-top: 15%;">
                @if (i !== 0) {
                  <fb-button
                    variant="ghost"
                    ariaLabel="Previous"
                    (pressed)="currentPage = currentPage - 1"
                  >
                    <fb-icon name="keyboard_arrow_left" ariaLabel=""></fb-icon>
                  </fb-button>
                }
              </div>
            }
            <div class="flex-auto">
              <fb-card>
                <fb-card-content>
                  <div class="flex flex-col">
                    <signalk-details-list
                      [details]="feature"
                    ></signalk-details-list>
                  </div>
                </fb-card-content>
              </fb-card>
            </div>
            @if (data.length > 1) {
              <div style="min-width:50px;text-align:right;padding-top: 15%;">
                @if (i !== data.length - 1) {
                  <fb-button
                    variant="ghost"
                    ariaLabel="Next"
                    (pressed)="currentPage = currentPage + 1"
                  >
                    <fb-icon name="keyboard_arrow_right" ariaLabel=""></fb-icon>
                  </fb-button>
                }
              </div>
            }
          </div>
        }
      }

      <div
        style="text-align:center;font-size:var(--font-size-sm);font-family:roboto;"
      >
        @for (c of data; track c; let i = $index) {
          <fb-icon
            name="fiber_manual_record"
            ariaLabel=""
            [style.color]="currentPage - 1 === i ? 'blue' : 'gray'"
            style="font-size:var(--font-size-xs);width:12px;"
          ></fb-icon>
        }
      </div>
    </div>
  `,
  styles: [
    `
      ._ap-feature {
        font-family: arial;
      }
      ._ap-feature .key-label {
        width: 150px;
        font-weight: bold;
      }
    `
  ]
})
export class FeaturePropertiesModal {
  protected display: Feature['properties'][] = [];
  protected currentPage = 1;

  protected modalRef = inject(MatBottomSheetRef<FeaturePropertiesModal>);
  protected data = inject<Feature[]>(MAT_BOTTOM_SHEET_DATA);

  constructor() {
    this.display = Array.isArray(this.data)
      ? this.data.map((f) => f.properties)
      : [];
  }
}
