/** Login Dialog Component **
 ****************************/

import type { OnInit, AfterViewInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

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
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  styles: [],
  template: `
    <mat-dialog-content>
      <mat-card>
        <mat-card-title-group>
          <mat-icon>account_circle</mat-icon>
          <mat-card-title>Sign-In</mat-card-title>
          <mat-card-subtitle>{{ data.message }}</mat-card-subtitle>
        </mat-card-title-group>
        <mat-card-content>
          <mat-form-field>
            <mat-label>User name</mat-label>
            <input
              matInput
              type="text"
              value=""
              #username
              (keyup)="keyUp($event, username, password)"
              style="width:110px;"
              (focus)="handleFocus($event)"
            /> </mat-form-field
          ><br />
          <mat-form-field>
            <mat-label>Password</mat-label>
            <input
              matInput
              type="password"
              value=""
              #password
              (keyup)="keyUp($event, username, password)"
              style="width:110px;"
              (focus)="handleFocus($event)"
            />
          </mat-form-field>
        </mat-card-content>
        <mat-card-actions align="end">
          <button
            default
            mat-raised-button
            [disabled]="username.value.length === 0"
            (click)="login(username.value, password.value)"
          >
            {{ data.button1Text }}
          </button>
          &nbsp;&nbsp;
          <button default mat-raised-button (click)="cancel()">
            {{ data.button2Text }}
          </button>
        </mat-card-actions>
      </mat-card>
    </mat-dialog-content>
  `
})
export class LoginDialog implements OnInit, AfterViewInit {
  @ViewChild('username', { static: false })
  username: ElementRef<HTMLInputElement> | undefined;

  public imgSource = 'assets/img/success.png';
  private result: { cancel: boolean; user: string | null; pwd: string | null } =
    {
      cancel: false,
      user: null,
      pwd: null
    };

  constructor(
    public dialogRef: MatDialogRef<LoginDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.data.message = this.data.message || '';
    this.data.button1Text = this.data.button1Text || 'Log in';
    this.data.button2Text = this.data.button2Text || 'Cancel';
  }

  ngAfterViewInit() {
    setTimeout(() => this.username?.nativeElement.focus(), 500);
  }

  keyUp(e: KeyboardEvent, u: HTMLInputElement, p: HTMLInputElement) {
    if (e.key === 'Enter') {
      this.login(u.value, p.value);
    }
  }

  handleFocus(e: FocusEvent) {
    const target = e.currentTarget as HTMLInputElement;
    target.setSelectionRange(0, target.value.length);
  }

  // ** cancelled login
  cancel() {
    this.result.cancel = true;
    this.dialogRef.close(this.result);
  }

  //** submit log in
  login(user = '', password = '') {
    this.result.cancel = false;
    this.result.user = user;
    this.result.pwd = password;
    this.dialogRef.close(this.result);
  }
}
