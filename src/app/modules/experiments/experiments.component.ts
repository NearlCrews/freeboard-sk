/** Experiments Components **
 ********************************/

import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';

import {
  FbFabComponent,
  FbIconComponent
} from 'src/app/design-system/primitives';

/********* ExperimentsComponent ********/
@Component({
  selector: 'fb-experiments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatMenuModule, FbIconComponent, FbFabComponent, MatTooltipModule],
  template: `
    <mat-menu #experimentsmenu="matMenu">
      <!--
      <a mat-menu-item (click)="handleSelect('exp_id_here')">
          <mat-icon>filter_drama</mat-icon>
          <span>EXP_NAME_HERE</span>			
      </a>
      <a mat-menu-item [disabled]="true">
        <span>None Available</span>
      </a>
      -->
      <a mat-menu-item (click)="handleSelect('debugCapture')">
        <fb-icon name="adb" ariaLabel=""></fb-icon>
        <span>Capture Debug Info</span>
      </a>
    </mat-menu>

    <div>
      <fb-fab
        class="button-toolbar"
        icon="science"
        ariaLabel="Experiments menu"
        [matMenuTriggerFor]="experimentsmenu"
        matTooltip="Experiments"
        matTooltipPosition="left"
      ></fb-fab>
    </div>
  `,
  styles: [``]
})
export class ExperimentsComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly selected = output<any>();

  //constructor() {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSelect(choice: string, value?: any) {
    this.selected.emit({ choice: choice, value: value });
  }
}
