/** About Dialog Component **
 ****************************/

import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

import {
  FbButtonComponent,
  FbDialogActionsDirective,
  FbDialogContentDirective,
  FbDialogTitleDirective,
  FbIconComponent
} from 'src/app/design-system/primitives';

export interface AboutDialogData {
  name: string;
  version: string;
  description: string;
  logo: string;
  url?: string;
  captureDebug?: () => void;
}
@Component({
  selector: 'ap-about-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbDialogActionsDirective,
    FbDialogContentDirective,
    FbDialogTitleDirective,
    FbIconComponent
  ],
  template: `
    <div>
      <h1 fbDialogTitle>
        <fb-icon name="info" ariaLabel=""></fb-icon>&nbsp;About
      </h1>
      <div fbDialogContent>
        <div class="about-row">
          <div class="item"><img [src]="data.logo" /></div>
          <div class="item">
            <span style="font-weight:bold;">{{ data.name }}</span
            >&nbsp;&nbsp;<br />
            <span class="description">
              {{ data.description }}
            </span>
            <br />
            <span>Version: {{ data.version }}</span>
            <br /><br />
          </div>
        </div>
      </div>
      <div fbDialogActions align="center">
        @if (data.url) {
          <fb-button variant="ghost" [href]="data.url" target="_blank">
            Visit Website
          </fb-button>
          &nbsp;
        }
        @if (data.captureDebug) {
          <fb-button variant="ghost" (pressed)="data.captureDebug()">
            <fb-icon name="adb" ariaLabel=""></fb-icon>&nbsp;Capture Debug Info
          </fb-button>
          &nbsp;
        }
        <fb-button variant="primary" (pressed)="dialogRef.close(false)">
          Close
        </fb-button>
      </div>
    </div>
  `,
  styles: [
    `
      .about-row {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: flex-start;
        align-content: stretch;
        font-family: roboto;
      }
      .about-row .item {
        padding-left: 10px;
      }
      .about-row img {
        width: 42px;
      }
      .about-row .description {
        font-size: 12pt;
      }
    `
  ]
})
export class AboutDialog {
  constructor(
    public dialogRef: DialogRef<unknown, AboutDialog>,
    @Inject(DIALOG_DATA) public data: AboutDialogData
  ) {}
}
