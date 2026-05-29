/** popover Component **
 ************************/

import {
  Component,
  Input,
  output,
  ChangeDetectionStrategy
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FbButtonComponent,
  FbIconComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';

/*********** Popover ***************
title: string -  title text,
canClose: boolean - show close button
measure: boolean= measure mode;
***********************************/
@Component({
  selector: 'ap-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FbButtonComponent,
    FbIconComponent,
    FbTooltipDirective
  ],
  template: `
    <div
      class="popover top in fb-app-background"
      [ngClass]="{ measure: measure }"
    >
      <div class="popover-title">
        <div
          [ngClass]="{ measure: measure }"
          style="flex: 1 1 auto;overflow: hidden;
                                display: -webkit-box;
                                -webkit-box-orient: vertical;
                                -webkit-line-clamp: 1;
                                line-clamp: 1;
                                text-overflow:ellipsis;"
        >
          @if (icon; as ic) {
            <fb-icon
              [class]="ic.class ?? ''"
              [svgName]="ic.svgIcon ?? ''"
              [name]="ic.name ?? ''"
              ariaLabel=""
            ></fb-icon>
          }
          &nbsp;{{ title }}
        </div>
        @if (canClose) {
          <div>
            <fb-button
              variant="ghost"
              ariaLabel="Close"
              (pressed)="handleClose()"
            >
              <fb-icon name="close" ariaLabel=""></fb-icon>
            </fb-button>
          </div>
        }
        @if (!canClose && navTo) {
          <div>
            <fb-button
              variant="ghost"
              ariaLabel="Navigate to here"
              fbTooltip="Navigate to here"
              (pressed)="handleNavTo()"
            >
              <fb-icon name="near_me" ariaLabel=""></fb-icon>
            </fb-button>
          </div>
        }
      </div>
      <div class="popover-content">
        <ng-content></ng-content>
      </div>

      <div class="arrow" style="left:50%;"></div>
    </div>
  `,
  styleUrls: ['./popover.component.scss']
})
export class PopoverComponent {
  @Input() title = '';
  @Input() icon:
    | { class?: string; name?: string; svgIcon?: string }
    | undefined;
  @Input() canClose = true;
  @Input() measure = false;
  @Input() navTo = false;
  readonly closed = output<void>();
  readonly navigateTo = output<void>();

  handleClose() {
    this.closed.emit();
  }

  handleNavTo() {
    this.navigateTo.emit();
  }
}
