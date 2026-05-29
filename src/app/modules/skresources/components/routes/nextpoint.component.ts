import {
  Component,
  ChangeDetectionStrategy,
  output,
  input
} from '@angular/core';
import {
  FbButtonComponent,
  FbIconComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';

@Component({
  selector: 'route-nextpoint',
  imports: [FbButtonComponent, FbIconComponent, FbTooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="mat-app-background"
      style="height: 96px;border: 1px rgba(0,0,0,0) solid;"
    >
      <div style="display: flex; flex: auto; flex-wrap: nowrap; width:90px;">
        <div style="flex: auto">
          <fb-button
            class="nav-button"
            variant="ghost"
            ariaLabel="Previous point"
            fbTooltip="Previous point"
            fbTooltipPosition="above"
            [disabled]="!circular() && index() === 0"
            (pressed)="changeIndex(-1)"
          >
            <fb-icon name="skip_previous" ariaLabel=""></fb-icon>
          </fb-button>
        </div>
        <div style="flex: auto">
          <fb-button
            class="nav-button"
            variant="ghost"
            ariaLabel="Next point"
            fbTooltip="Next point"
            fbTooltipPosition="above"
            [disabled]="!circular() && index() >= total() - 1"
            (pressed)="changeIndex(1)"
          >
            <fb-icon name="skip_next" ariaLabel=""></fb-icon>
          </fb-button>
        </div>
      </div>
      <div style="font-family:roboto;line-height: 40px;">
        {{ index() + 1 }} of {{ total() }}
      </div>
    </div>
  `,
  styles: [
    `
      .nav-button {
        height: 40px;
      }
    `
  ]
})
export class RouteNextPointComponent {
  index = input<number>(0);
  total = input<number>(0);
  circular = input<boolean>(false);
  selected = output<number>();

  changeIndex(i: number) {
    if (i === 1) {
      if (this.circular() && this.index() === this.total() - 1) {
        this.selected.emit(1);
      } else {
        this.selected.emit(this.index() + 1);
      }
    } else {
      if (this.circular() && this.index() === 0) {
        this.selected.emit(this.total() - 2);
      } else {
        this.selected.emit(this.index() - 1);
      }
    }
  }
}
