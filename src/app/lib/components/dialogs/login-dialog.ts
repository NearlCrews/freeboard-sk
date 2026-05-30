/** Login Dialog Component **
 ****************************/

import type { OnInit, AfterViewInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  ViewChild,
  signal
} from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardHeaderComponent,
  FbCardContentComponent,
  FbCardActionsComponent,
  FbDialogContentDirective,
  FbFormFieldComponent,
  FbIconComponent,
  FbInputComponent
} from 'src/app/design-system/primitives';

/********* LoginDialog ****************
    data: {
        message: '',
        button1Text: 'Log in',
        button2Text: 'Cancel'
    }
***************************************/
@Component({
  selector: 'ap-login-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbCardComponent,
    FbCardHeaderComponent,
    FbCardContentComponent,
    FbCardActionsComponent,
    FbDialogContentDirective,
    FbFormFieldComponent,
    FbIconComponent,
    FbInputComponent
  ],
  styles: [],
  template: `
    <div fbDialogContent>
      <fb-card>
        <fb-card-header>
          <span fbCardTitle>
            <fb-icon name="account_circle" ariaLabel=""></fb-icon> Sign-In
          </span>
          <span fbCardSubtitle>{{ data.message }}</span>
        </fb-card-header>
        <fb-card-content>
          <fb-form-field #userField label="User name" [widthPx]="180">
            <fb-input
              #usernameInput
              [name]="userField.controlId"
              type="text"
              [(value)]="username"
              (keydown.enter)="submit()"
            ></fb-input>
          </fb-form-field>
          <fb-form-field #pwdField label="Password" [widthPx]="180">
            <fb-input
              [name]="pwdField.controlId"
              type="password"
              [(value)]="password"
              (keydown.enter)="submit()"
            ></fb-input>
          </fb-form-field>
        </fb-card-content>
        <fb-card-actions align="end">
          <fb-button
            default
            variant="primary"
            [disabled]="username().length === 0"
            (pressed)="submit()"
          >
            {{ data.button1Text }}
          </fb-button>
          &nbsp;&nbsp;
          <fb-button default variant="ghost" (pressed)="cancel()">
            {{ data.button2Text }}
          </fb-button>
        </fb-card-actions>
      </fb-card>
    </div>
  `
})
export class LoginDialog implements OnInit, AfterViewInit {
  @ViewChild('usernameInput', { static: false, read: ElementRef })
  usernameInputRef: ElementRef<HTMLElement> | undefined;

  protected readonly username = signal<string>('');
  protected readonly password = signal<string>('');

  private result: { cancel: boolean; user: string | null; pwd: string | null } =
    {
      cancel: false,
      user: null,
      pwd: null
    };

  constructor(
    public dialogRef: DialogRef<unknown, LoginDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.data.message = this.data.message || '';
    this.data.button1Text = this.data.button1Text || 'Log in';
    this.data.button2Text = this.data.button2Text || 'Cancel';
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.usernameInputRef?.nativeElement.querySelector('input')?.focus();
    }, 500);
  }

  protected submit(): void {
    this.login(this.username(), this.password());
  }

  protected cancel(): void {
    this.result.cancel = true;
    this.dialogRef.close(this.result);
  }

  private login(user: string, password: string): void {
    this.result.cancel = false;
    this.result.user = user;
    this.result.pwd = password;
    this.dialogRef.close(this.result);
  }
}
