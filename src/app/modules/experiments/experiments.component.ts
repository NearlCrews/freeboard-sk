/** Experiments Components **
 ********************************/

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatTooltipModule } from '@angular/material/tooltip';

import {
  FbFabComponent,
  FbMenuService,
  type FbMenuItem
} from 'src/app/design-system/primitives';

/********* ExperimentsComponent ********/
@Component({
  selector: 'fb-experiments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbFabComponent, MatTooltipModule],
  template: `
    <div>
      <fb-fab
        variant="secondary"
        icon="science"
        ariaLabel="Experiments menu"
        matTooltip="Experiments"
        matTooltipPosition="left"
        (pressed)="openExperimentsMenu($event)"
      ></fb-fab>
    </div>
  `,
  styles: [``]
})
export class ExperimentsComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly selected = output<any>();

  private destroyRef = inject(DestroyRef);
  private menu = inject(FbMenuService);

  private readonly experimentsMenuItems: readonly FbMenuItem[] = [
    { id: 'debugCapture', label: 'Capture Debug Info', icon: 'adb' }
  ];

  protected openExperimentsMenu(event: MouseEvent) {
    const trigger = event.currentTarget as HTMLElement;
    this.menu
      .open(trigger, this.experimentsMenuItems)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        if (id) {
          this.handleSelect(id);
        }
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSelect(choice: string, value?: any) {
    this.selected.emit({ choice: choice, value: value });
  }
}
