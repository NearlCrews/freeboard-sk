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

/********* AboutDialog ****************
    data: {
        name: this.app.name,
        version: this.app.version,
        description: this.app.description,
        logo: this.app.logo,
        url: this.app.url
    }
***************************************/
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(DIALOG_DATA) public data: any
  ) {}
}
