/***********************************
NSEW arrow buttons component
  <nsew-buttons>
***********************************/
import {
  Component,
  Input,
  output,
  ChangeDetectionStrategy
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';

import { FbIconComponent } from 'src/app/design-system/primitives';

@Component({
  selector: 'nsew-buttons',
  imports: [MatButtonModule, FbIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .nsew {
        border: silver 0px solid;
      }
      .nsew .btnRow {
        display: flex;
        flex-wrap: no-wrap;
      }
      .nsew .btnDiv {
        width: 50px;
      }
    `
  ],
  template: `
    <div class="nsew">
      <div class="btnRow">
        <div class="btnDiv"></div>
        <div class="btnDiv">
          <button mat-mini-fab [disabled]="disabled" (click)="action(0)">
            <fb-icon name="arrow_upward" ariaLabel=""></fb-icon>
          </button>
        </div>
        <div class="btnDiv"></div>
      </div>

      <div class="btnRow">
        <div class="btnDiv">
          <button mat-mini-fab [disabled]="disabled" (click)="action(270)">
            <fb-icon name="arrow_back" ariaLabel=""></fb-icon>
          </button>
        </div>
        <div class="btnDiv"></div>
        <div class="btnDiv">
          <button mat-mini-fab [disabled]="disabled" (click)="action(90)">
            <fb-icon name="arrow_forward" ariaLabel=""></fb-icon>
          </button>
        </div>
      </div>

      <div class="btnRow">
        <div class="btnDiv"></div>
        <div class="btnDiv">
          <button mat-mini-fab [disabled]="disabled" (click)="action(180)">
            <fb-icon name="arrow_downward" ariaLabel=""></fb-icon>
          </button>
        </div>
        <div class="btnDiv"></div>
      </div>
    </div>
  `
})
export class NSEWButtonsComponent {
  @Input() disabled = false;
  readonly direction = output<number>();

  constructor() {}

  action(value: number) {
    this.direction.emit(value);
  }
}
