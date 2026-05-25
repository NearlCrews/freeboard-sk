import {
  Component,
  Input,
  output,
  ChangeDetectionStrategy
} from '@angular/core';

import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PopoverComponent } from './popover.component';

/*********** Chart boundaries List Popover ***************
  features: Array<{id: string, name: string}> - list of chart boundaries
  *************************************************/
@Component({
  selector: 'chart-list-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatListModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    PopoverComponent
  ],
  template: `
    <ap-popover [title]="title" [canClose]="canClose" (closed)="handleClose()">
      <mat-nav-list>
        @for (c of features; track c) {
          <mat-list-item (click)="handleSelect(c.id)">
            <mat-icon>map</mat-icon>
            {{ c.text }}
          </mat-list-item>
        }
      </mat-nav-list>
    </ap-popover>
  `,
  styleUrls: []
})
export class ChartListPopoverComponent {
  protected title = 'Click to Show / Hide Chart';
  @Input() features: { id: string; text: string }[] = [];
  @Input() canClose: boolean;
  readonly closed = output<void>();
  readonly selected = output<string>();

  handleSelect(id: string) {
    this.selected.emit(id);
  }
  handleClose() {
    this.closed.emit();
  }
}
