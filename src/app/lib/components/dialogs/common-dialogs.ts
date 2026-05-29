/** Dialog Components **
 ************************/

import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

import {
  FbButtonComponent,
  FbCheckboxComponent,
  FbDialogActionsDirective,
  FbDialogContentDirective,
  FbDialogTitleDirective,
  FbIconComponent,
  FB_SNACK_BAR_DATA
} from 'src/app/design-system/primitives';

/*********** MsgBox ***************
	data: {
        message: "<string>" text to display,
        title: "<string>" title text,
        buttonText"<string>" button text
    }
***********************************/
@Component({
  selector: 'ap-msgbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbDialogActionsDirective,
    FbDialogContentDirective,
    FbDialogTitleDirective
  ],
  template: `
    <div class="_ap-msgbox">
      <div>
        <h1 fbDialogTitle>{{ data.title }}</h1>
      </div>
      <div fbDialogContent>
        @for (line of msglines; track line) {
          <div>
            <div>{{ line }}&nbsp;</div>
          </div>
        }
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
      ._ap-msgbox {
        font-family: Roboto;
        min-width: 150px;
      }
    `
  ]
})
export class MsgBox implements OnInit {
  public msglines = [];

  constructor(
    public dialogRef: DialogRef<unknown, MsgBox>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(DIALOG_DATA) public data: any
  ) {}

  //** lifecycle: events **
  ngOnInit() {
    this.data.buttonText = this.data.buttonText || 'OK';
    this.msglines = this.data.message.split('\n');
  }
}

/********* AlertDialog ************
	data: {
      message: "<string>" text to display,
      title: "<string>" title text,
      buttonText"<string>" button text,
  }
***********************************/
@Component({
  selector: 'ap-alertdialog',
  imports: [
    FbButtonComponent,
    FbDialogActionsDirective,
    FbDialogContentDirective,
    FbDialogTitleDirective,
    FbIconComponent
  ],
  template: `
    <div class="_ap-alert">
      <div>
        <h1 fbDialogTitle>
          <fb-icon
            name="warning"
            ariaLabel=""
            style="color: var(--safety-alert-warn);"
          ></fb-icon>
          &nbsp;{{ data.title }}
        </h1>
      </div>
      <div fbDialogContent>
        <div class="flex">
          <div class="pl-md">
            @for (line of msglines; track line) {
              <div>
                <div>{{ line }}&nbsp;</div>
              </div>
            }
          </div>
        </div>
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
      ._ap-alert {
        min-width: 150px;
      }
    `
  ]
})
export class AlertDialog implements OnInit {
  public msglines = [];
  public image = null;

  constructor(
    public dialogRef: DialogRef<unknown, AlertDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(DIALOG_DATA) public data: any
  ) {}

  //** lifecycle: events **
  ngOnInit() {
    this.data.buttonText = this.data.buttonText || 'OK';
    this.msglines = this.data.message.split('\n');
  }
}

/********* ConfirmDialog **********
	data: {
        message: "<string>" text to display,
        title: "<string>" title text,
        checkText: string text for check box
        button1Text"<string>" button 1 text,
        button2Text"<string>" button 2 text
    }
***********************************/
@Component({
  selector: 'ap-confirmdialog',
  imports: [
    FbButtonComponent,
    FbCheckboxComponent,
    FbDialogActionsDirective,
    FbDialogContentDirective,
    FbDialogTitleDirective,
    FbIconComponent
  ],
  template: `
    <div class="_ap-confirm">
      <div>
        <h1 fbDialogTitle>
          <fb-icon
            name="help"
            ariaLabel=""
            style="color: var(--color-accent);"
          ></fb-icon>
          &nbsp;{{ data.title }}
        </h1>
      </div>
      <div fbDialogContent style="overflow:unset">
        <div class="flex">
          <div class="pl-md">
            @for (line of msglines; track line) {
              <div>
                <div>{{ line }}&nbsp;</div>
              </div>
            }
          </div>
        </div>
        <div class="flex">
          @if (data.checkText) {
            <div class="pl-md">
              <div style="font-weight: 500;">
                <fb-checkbox (checkedChange)="checked = $event">
                  {{ data.checkText }}&nbsp;
                </fb-checkbox>
              </div>
            </div>
          }
        </div>
      </div>
      <div fbDialogActions align="center">
        <fb-button
          variant="primary"
          (pressed)="dialogRef.close({ ok: true, checked: checked })"
        >
          {{ data.button1Text }}
        </fb-button>
        <fb-button variant="ghost" (pressed)="dialogRef.close(null)">
          {{ data.button2Text }}
        </fb-button>
      </div>
    </div>
  `,
  styles: [
    `
      ._ap-confirm {
        font-family: Roboto;
        min-width: 150px;
      }
    `
  ]
})
export class ConfirmDialog implements OnInit {
  public msglines = [];
  public checked = false;

  constructor(
    public dialogRef: DialogRef<unknown, ConfirmDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(DIALOG_DATA) public data: any
  ) {}

  //** lifecycle: events **
  ngOnInit() {
    this.data.button1Text = this.data.button1Text || 'Yes';
    this.data.button2Text = this.data.button2Text || 'No';
    this.msglines = this.data.message.split('\n');
  }
}

/********* MessageBarComponent ****************
    data: {
        message: '',  
        sound: boolean
    }
***************************************/
@Component({
  selector: 'message-bar',
  imports: [FbIconComponent],
  template: `
    <div class="message-bar">
      <fb-icon name="message" ariaLabel=""></fb-icon>
      <span class="message-bar__text">{{ data.message }}</span>
    </div>
    @if (data.sound) {
      <audio src="./assets/sound/ding.mp3" [autoplay]="true"></audio>
    }
  `,
  styles: [
    `
      .message-bar {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
      }
      .message-bar__text {
        flex: 0 1 auto;
      }
    `
  ]
})
export class MessageBarComponent {
  constructor(
    @Inject(FB_SNACK_BAR_DATA)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public data: any
  ) {}
}

/********* WelcomeDialog ****************
    data: { 
        buttonText: string,
        content: []
    }
***************************************/
@Component({
  selector: 'ap-welcome-dialog',
  imports: [FbButtonComponent, FbDialogContentDirective, FbIconComponent],
  template: `
    <div fbDialogContent>
      <div class="welcome">
        @for (c of data.content; track c; let i = $index) {
          @if (currentPage - 1 === i) {
            <div style="text-align:center;">
              <h3>{{ c.title }}</h3>
            </div>
            <div class="flex">
              <div style="min-width:50px;text-align:left;padding-top: 15%;">
                @if (i !== 0 && data.content.length > 1) {
                  <fb-button
                    variant="ghost"
                    ariaLabel="Previous page"
                    (pressed)="currentPage = currentPage - 1"
                  >
                    <fb-icon name="keyboard_arrow_left" ariaLabel=""></fb-icon>
                  </fb-button>
                }
              </div>
              <div class="flex-auto" [innerHTML]="c.message"></div>
              <div style="min-width:50px;text-align:right;padding-top: 15%;">
                @if (i !== data.content.length - 1) {
                  <fb-button
                    variant="ghost"
                    ariaLabel="Next page"
                    (pressed)="currentPage = currentPage + 1"
                  >
                    <fb-icon name="keyboard_arrow_right" ariaLabel=""></fb-icon>
                  </fb-button>
                }
              </div>
            </div>
          }
        }
        <div
          style="text-align:center;font-size:var(--font-size-sm);font-family:roboto;"
        >
          @for (c of data.content; track c; let i = $index) {
            <fb-icon
              name="fiber_manual_record"
              ariaLabel=""
              [class]="{
                'step-current': currentPage - 1 === i,
                'step-other': currentPage - 1 !== i
              }"
              style="font-size:var(--font-size-xs);width:12px;"
            ></fb-icon>
          }
        </div>
        <div style="text-align:center;">
          <fb-button
            variant="primary"
            (pressed)="dialogRef.close(data.showPrefs)"
          >
            {{ data.buttonText }}
          </fb-button>
          <br />&nbsp;
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .welcome h1 {
        font-weight: normal !important;
      }
      .welcome h3 {
        font-weight: 500;
      }
      .welcome-row {
        display: -webkit-box;
        display: -moz-box;
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: flex-start;
        align-content: stretch;
        font-family: roboto, Arial, Helvetica, sans-serif;
      }
      .welcome-row .item.stretch {
        text-align: center;
        width: 100%;
      }
      .welcome-row .item {
        padding-left: 5px;
      }
      .welcome-row img {
        width: 42px;
      }
      .welcome-row .description {
        font-size: 12pt;
      }
    `
  ]
})
export class WelcomeDialog {
  public currentPage = 1;

  constructor(
    public dialogRef: DialogRef<unknown, WelcomeDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(DIALOG_DATA) public data: any
  ) {}
}
