import {
  Component,
  Input,
  output,
  ChangeDetectionStrategy
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PopoverComponent } from './popover.component';

import {
  FbListItemComponent,
  FbNavListComponent
} from 'src/app/design-system/primitives';

/*********** Chart boundaries List Popover ***************
  features: Array<{id: string, name: string}> - list of chart boundaries
  *************************************************/
@Component({
  selector: 'chart-list-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    FbListItemComponent,
    FbNavListComponent,
    PopoverComponent
  ],
  template: `
    <ap-popover [title]="title" [canClose]="canClose" (closed)="handleClose()">
      <fb-nav-list ariaLabel="Chart list">
        @for (c of features; track c) {
          <fb-list-item interactive (activated)="handleSelect(c.id)">
            <mat-icon fbListItemLeading>map</mat-icon>
            {{ c.text }}
          </fb-list-item>
        }
      </fb-nav-list>
    </ap-popover>
  `,
  styleUrls: []
})
export class ChartListPopoverComponent {
  protected title = 'Click to Show / Hide Chart';
  @Input() features: { id: string; text: string }[] = [];
  @Input() canClose = false;
  readonly closed = output<void>();
  readonly selected = output<string>();

  handleSelect(id: string) {
    this.selected.emit(id);
  }
  handleClose() {
    this.closed.emit();
  }
}
