/** Dialog Components **
 ************************/

import type { OnInit, AfterViewInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';

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
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="_ap-msgbox">
      <div>
        <h1 mat-dialog-title>{{ data.title }}</h1>
      </div>
      <mat-dialog-content>
        @for (line of msglines; track line) {
          <div>
            <div>{{ line }}&nbsp;</div>
          </div>
        }
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
    public dialogRef: MatDialogRef<MsgBox>,
    @Inject(MAT_DIALOG_DATA) public data
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
  imports: [MatDialogModule, MatIconModule, MatButtonModule],
  template: `
    <div class="_ap-alert">
      <div>
        <h1 mat-dialog-title>
          <mat-icon style="color: orange;">warning</mat-icon>
          &nbsp;{{ data.title }}
        </h1>
      </div>
      <mat-dialog-content>
        <div style="display:flex;">
          <div style="padding-left: 10px;">
            @for (line of msglines; track line) {
              <div>
                <div>{{ line }}&nbsp;</div>
              </div>
            }
          </div>
        </div>
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
    public dialogRef: MatDialogRef<AlertDialog>,
    @Inject(MAT_DIALOG_DATA) public data
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
  imports: [MatDialogModule, MatIconModule, MatCheckboxModule, MatButtonModule],
  template: `
    <div class="_ap-confirm">
      <div>
        <h1 mat-dialog-title>
          <mat-icon style="color:orange;">help</mat-icon>
          &nbsp;{{ data.title }}
        </h1>
      </div>
      <mat-dialog-content style="overflow:unset">
        <div style="display:flex;">
          <div style="padding-left: 10px;">
            @for (line of msglines; track line) {
              <div>
                <div>{{ line }}&nbsp;</div>
              </div>
            }
          </div>
        </div>
        <div style="display:flex;">
          @if (data.checkText) {
            <div style="padding-left: 10px;">
              <div style="font-weight: 500;">
                <mat-checkbox (change)="checked = $event.checked">
                  {{ data.checkText }}&nbsp;
                </mat-checkbox>
              </div>
            </div>
          }
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <button
          mat-raised-button
          (click)="dialogRef.close({ ok: true, checked: checked })"
        >
          {{ data.button1Text }}
        </button>
        <button mat-raised-button (click)="dialogRef.close(null)">
          {{ data.button2Text }}
        </button>
      </mat-dialog-actions>
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
    public dialogRef: MatDialogRef<ConfirmDialog>,
    @Inject(MAT_DIALOG_DATA) public data
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
  imports: [MatIconModule],
  template: `
    <div class="message-bar">
      <mat-icon>message</mat-icon>&nbsp;&nbsp;
      {{ data.message }}
    </div>
    @if (data.sound) {
      <audio src="./assets/sound/ding.mp3" [autoplay]="true"></audio>
    }
  `,
  styles: [
    `
      .message-bar {
        font-family: roboto;
      }
    `
  ]
})
export class MessageBarComponent {
  constructor(@Inject(MAT_SNACK_BAR_DATA) public data) {}
}

/********* WelcomeDialog ****************
    data: { 
        buttonText: string,
        content: []
    }
***************************************/
@Component({
  selector: 'ap-welcome-dialog',
  imports: [MatDialogModule, MatStepperModule, MatIconModule, MatButtonModule],
  template: `
    <mat-dialog-content>
      <div class="welcome">
        <mat-horizontal-stepper [linear]="false" #stepper>
          @for (c of data.content; track c; let i = $index) {
            <mat-step>
              <div style="text-align:center;">
                <h3>{{ c.title }}</h3>
              </div>
              <div style="display:flex;">
                <div style="min-width:50px;text-align:left;padding-top: 15%;">
                  @if (i !== 0 && data.content.length > 1) {
                    <button
                      mat-icon-button
                      (click)="currentPage = currentPage - 1"
                      matStepperPrevious
                    >
                      <mat-icon>keyboard_arrow_left</mat-icon>
                    </button>
                  }
                </div>
                <div style="flex: 1 1 auto;" [innerHTML]="c.message"></div>
                <div style="min-width:50px;text-align:right;padding-top: 15%;">
                  @if (i !== data.content.length - 1) {
                    <button
                      mat-icon-button
                      (click)="currentPage = currentPage + 1"
                      matStepperNext
                    >
                      <mat-icon>keyboard_arrow_right</mat-icon>
                    </button>
                  }
                </div>
              </div>
            </mat-step>
          }
        </mat-horizontal-stepper>
        <div style="text-align:center;font-size:10pt;font-family:roboto;">
          @for (c of data.content; track c; let i = $index) {
            <mat-icon
              [class]="{
                'step-current': currentPage - 1 === i,
                'step-other': currentPage - 1 !== i
              }"
              style="font-size:8pt;width:12px;"
            >
              fiber_manual_record
            </mat-icon>
          }
        </div>
        <div style="text-align:center;">
          <button mat-raised-button (click)="dialogRef.close(data.showPrefs)">
            {{ data.buttonText }}
          </button>
          <br />&nbsp;
        </div>
      </div>
    </mat-dialog-content>
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
export class WelcomeDialog implements AfterViewInit {
  public currentPage = 1;

  constructor(
    public dialogRef: MatDialogRef<WelcomeDialog>,
    @Inject(MAT_DIALOG_DATA) public data
  ) {}

  ngAfterViewInit() {
    const sh = document.getElementsByClassName(
      'mat-horizontal-stepper-header-container'
    );
    if (sh.length) {
      (sh[0] as HTMLElement).style.display = 'none';
    }
  }
}
