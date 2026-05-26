/** About Dialog Component **
 ****************************/

import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

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
  imports: [MatDialogModule, MatIconModule, MatButtonModule],
  template: `
    <div>
      <h1 mat-dialog-title><mat-icon>info</mat-icon>&nbsp;About</h1>
      <mat-dialog-content>
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
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        @if (data.url) {
          <a mat-button [href]="data.url" target="_web" rel="noopener"
            >Visit Website</a
          >
          &nbsp;
        }
        <button mat-raised-button (click)="dialogRef.close(false)">
          Close
        </button>
      </mat-dialog-actions>
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
    public dialogRef: MatDialogRef<AboutDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
}
