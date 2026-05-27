import {
  Component,
  Input,
  output,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PopoverComponent } from './popover.component';

import {
  FbListItemComponent,
  FbNavListComponent
} from 'src/app/design-system/primitives';

/*********** feature List Popover ***************
  title: string -  title text,
  features: Array<any> - list of features
  *************************************************/
@Component({
  selector: 'feature-list-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    FbListItemComponent,
    FbNavListComponent,
    PopoverComponent
  ],
  template: `
    <ap-popover [title]="title" [canClose]="canClose" (closed)="handleClose()">
      <fb-nav-list ariaLabel="Feature list">
        @for (f of features; track f) {
          <fb-list-item interactive (activated)="handleSelect(f)">
            <span fbListItemLeading>
              @if (f.icon === 'route') {
                <mat-icon class="ob" [svgIcon]="f.icon"></mat-icon>
              } @else if (f.icon.indexOf('sk-') === 0) {
                <mat-icon [svgIcon]="f.icon"></mat-icon>
              } @else {
                <mat-icon
                  [ngClass]="{
                    'icon-warn': f.text && f.text.indexOf('self') !== -1
                  }"
                >
                  {{ f.icon }}
                </mat-icon>
              }
            </span>
            {{ f.text }}
          </fb-list-item>
        }
      </fb-nav-list>
    </ap-popover>
  `,
  styleUrls: []
})
export class FeatureListPopoverComponent {
  @Input() title = '';
  @Input() features: { text: string; icon: string }[] = [];
  @Input() canClose = false;
  readonly closed = output<void>();
  readonly selected = output<{ text: string; icon: string }>();

  handleSelect(item: { text: string; icon: string }) {
    this.selected.emit(item);
  }
  handleClose() {
    this.closed.emit();
  }
}
