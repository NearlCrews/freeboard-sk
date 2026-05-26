import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit
} from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';

/********* ErrorListDialog ************
	data: {
      errorList: "<ErrorList>" text to display,
      buttonText"<string>" button text,
  }
***********************************/
@Component({
  selector: 'ap-errorlistdialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatListModule],
  template: `
    <div class="_ap-errlist">
      <div>
        <h1 mat-dialog-title>
          <mat-icon style="color: orange;">warning</mat-icon>
          &nbsp;{{ data.errorList?.length }} Errors Encountered
        </h1>
      </div>
      <mat-dialog-content>
        <mat-list role="list">
          @for (err of data.errorList; track err) {
            <mat-list-item>
              <span matListItemTitle>{{ err.message }}</span>
              <span matListItemLine>Status: {{ err.status }}</span>
            </mat-list-item>
          }
        </mat-list>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <button mat-raised-button (click)="dialogRef.close(true)">
          {{ data.buttonText }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-errlist {
        min-width: 150px;
      }
    `
  ],
  standalone: true
})
export class ErrorListDialog implements OnInit {
  public image = null;

  constructor(
    public dialogRef: MatDialogRef<ErrorListDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  //** lifecycle: events **
  ngOnInit() {
    this.data.buttonText = this.data.buttonText || 'OK';
  }
}
