import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit
} from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

import {
  FbButtonComponent,
  FbDialogActionsDirective,
  FbDialogContentDirective,
  FbDialogTitleDirective,
  FbIconComponent,
  FbListComponent,
  FbListItemComponent
} from 'src/app/design-system/primitives';

/********* ErrorListDialog ************
	data: {
      errorList: "<ErrorList>" text to display,
      buttonText"<string>" button text,
  }
***********************************/
@Component({
  selector: 'ap-errorlistdialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbDialogActionsDirective,
    FbDialogContentDirective,
    FbDialogTitleDirective,
    FbIconComponent,
    FbListComponent,
    FbListItemComponent
  ],
  template: `
    <div class="_ap-errlist">
      <div>
        <h1 fbDialogTitle>
          <fb-icon
            name="warning"
            ariaLabel=""
            style="color: var(--safety-alert-warn);"
          ></fb-icon>
          &nbsp;{{ data.errorList?.length }} Errors Encountered
        </h1>
      </div>
      <div fbDialogContent>
        <fb-list>
          @for (err of data.errorList; track err) {
            <fb-list-item>
              {{ err.message }}
              <span fbListItemSubtext>Status: {{ err.status }}</span>
            </fb-list-item>
          }
        </fb-list>
      </div>
      <div fbDialogActions align="center">
        <fb-button variant="primary" (pressed)="dialogRef.close(true)">
          {{ data.buttonText }}
        </fb-button>
      </div>
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
  constructor(
    public dialogRef: DialogRef<unknown, ErrorListDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(DIALOG_DATA) public data: any
  ) {}

  //** lifecycle: events **
  ngOnInit() {
    this.data.buttonText = this.data.buttonText || 'OK';
  }
}
