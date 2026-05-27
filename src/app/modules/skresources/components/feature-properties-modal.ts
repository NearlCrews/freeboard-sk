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
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { SignalKDetailsComponent } from '../components/signalk-details.component';
import { Feature } from 'geojson';

import {
  FbCardComponent,
  FbCardContentComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

@Component({
  selector: 'ap-feature-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatButtonModule,
    FbCardComponent,
    FbCardContentComponent,
    FbToolbarComponent,
    SignalKDetailsComponent,
    MatStepperModule
  ],
  template: `
    <div class="_ap-feature">
      <fb-toolbar style="background-color: transparent">
        <span fbToolbarLeading><mat-icon>info</mat-icon></span>
        <span fbToolbarTitle> Feature Properties </span>
        <span fbToolbarActions>
          <button
            mat-icon-button
            (click)="modalRef.dismiss()"
            matTooltip="Close"
            matTooltipPosition="below"
          >
            <mat-icon>keyboard_arrow_down</mat-icon>
          </button>
        </span>
      </fb-toolbar>

      <mat-horizontal-stepper [linear]="false" #stepper>
        @for (feature of display; track feature; let i = $index) {
          <mat-step>
            <div style="display:flex;">
              @if (data.length > 1) {
                <div style="min-width:50px;text-align:left;padding-top: 15%;">
                  @if (i !== 0) {
                    <button
                      mat-icon-button
                      (click)="currentPage = currentPage - 1"
                      matStepperPrevious
                    >
                      <mat-icon>keyboard_arrow_left</mat-icon>
                    </button>
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
                    <button
                      mat-icon-button
                      (click)="currentPage = currentPage + 1"
                      matStepperNext
                    >
                      <mat-icon>keyboard_arrow_right</mat-icon>
                    </button>
                  }
                </div>
              }
            </div>
          </mat-step>
        }
      </mat-horizontal-stepper>

      <div style="text-align:center;font-size:10pt;font-family:roboto;">
        @for (c of data; track c; let i = $index) {
          <mat-icon
            [style.color]="currentPage - 1 === i ? 'blue' : 'gray'"
            style="font-size:8pt;width:12px;"
          >
            fiber_manual_record
          </mat-icon>
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
