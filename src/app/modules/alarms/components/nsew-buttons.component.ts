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

import { FbFabComponent } from 'src/app/design-system/primitives';

@Component({
  selector: 'nsew-buttons',
  imports: [FbFabComponent],
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
          <fb-fab
            icon="arrow_upward"
            ariaLabel="North"
            [disabled]="disabled"
            (pressed)="action(0)"
          ></fb-fab>
        </div>
        <div class="btnDiv"></div>
      </div>

      <div class="btnRow">
        <div class="btnDiv">
          <fb-fab
            icon="arrow_back"
            ariaLabel="West"
            [disabled]="disabled"
            (pressed)="action(270)"
          ></fb-fab>
        </div>
        <div class="btnDiv"></div>
        <div class="btnDiv">
          <fb-fab
            icon="arrow_forward"
            ariaLabel="East"
            [disabled]="disabled"
            (pressed)="action(90)"
          ></fb-fab>
        </div>
      </div>

      <div class="btnRow">
        <div class="btnDiv"></div>
        <div class="btnDiv">
          <fb-fab
            icon="arrow_downward"
            ariaLabel="South"
            [disabled]="disabled"
            (pressed)="action(180)"
          ></fb-fab>
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
