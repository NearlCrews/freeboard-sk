import {
  ChangeDetectionStrategy,
  Component,
  inject,
  AfterViewInit
} from '@angular/core';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatStepperModule } from '@angular/material/stepper';
import { SignalKDetailsComponent } from '../components/signalk-details.component';
import { Feature } from 'geojson';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbIconComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

@Component({
  selector: 'ap-feature-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    FbButtonComponent,
    FbCardComponent,
    FbCardContentComponent,
    FbIconComponent,
    FbToolbarComponent,
    SignalKDetailsComponent,
    MatStepperModule
  ],
  template: `
    <div class="_ap-feature">
      <fb-toolbar style="background-color: transparent">
        <span fbToolbarLeading
          ><fb-icon name="info" ariaLabel=""></fb-icon
        ></span>
        <span fbToolbarTitle> Feature Properties </span>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            ariaLabel="Close"
            (pressed)="modalRef.dismiss()"
            matTooltip="Close"
            matTooltipPosition="below"
          >
            <fb-icon name="keyboard_arrow_down" ariaLabel=""></fb-icon>
          </fb-button>
        </span>
      </fb-toolbar>

      <mat-horizontal-stepper [linear]="false" #stepper>
        @for (feature of display; track feature; let i = $index) {
          <mat-step>
            <div style="display:flex;">
              @if (data.length > 1) {
                <div style="min-width:50px;text-align:left;padding-top: 15%;">
                  @if (i !== 0) {
                    <fb-button
                      variant="ghost"
                      ariaLabel="Previous"
                      (pressed)="currentPage = currentPage - 1"
                      matStepperPrevious
                    >
                      <fb-icon
                        name="keyboard_arrow_left"
                        ariaLabel=""
                      ></fb-icon>
                    </fb-button>
                  }
                </div>
              }
              <div style="flex: 1 1 auto;">
                <fb-card>
                  <fb-card-content>
                    <div style="display:flex;flex-direction: column;">
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
                      matStepperNext
                    >
                      <fb-icon
                        name="keyboard_arrow_right"
                        ariaLabel=""
                      ></fb-icon>
                    </fb-button>
                  }
                </div>
              }
            </div>
          </mat-step>
        }
      </mat-horizontal-stepper>

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
export class FeaturePropertiesModal implements AfterViewInit {
  protected display: Feature['properties'][] = [];
  protected currentPage = 1;

  protected modalRef = inject(MatBottomSheetRef<FeaturePropertiesModal>);
  protected data = inject<Feature[]>(MAT_BOTTOM_SHEET_DATA);

  constructor() {
    this.display = Array.isArray(this.data)
      ? this.data.map((f) => f.properties)
      : [];
  }

  ngAfterViewInit() {
    const sh = document.getElementsByClassName(
      'mat-horizontal-stepper-header-container'
    );
    const header = sh[0] as HTMLElement | undefined;
    if (header) {
      header.style.display = 'none';
    }
  }
}
