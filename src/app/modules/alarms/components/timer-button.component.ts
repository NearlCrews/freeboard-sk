/***********************************
timer button component
    <timer-button>
***********************************/
import {
  Component,
  Input,
  output,
  ChangeDetectionStrategy,
  signal,
  OnInit,
  OnDestroy
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';

import { FbIconComponent } from 'src/app/design-system/primitives';

@Component({
  selector: 'timer-button',
  imports: [MatButtonModule, FbIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [``],
  template: `
    <div>
      @if (cancelled()) {
        &nbsp;
        <button mat-raised-button (click)="action()">
          @if (icon) {
            <fb-icon [name]="icon" ariaLabel=""></fb-icon>
          }
          {{ cancelledLabel }}
        </button>
      } @else {
        <button mat-button [disabled]="disabled" (click)="cancel()">
          {{ label }} {{ timeLeft() }} secs
        </button>
      }
    </div>
  `
})
export class TimerButtonComponent implements OnInit, OnDestroy {
  @Input() period = 5000; // timeout period in milliseconds
  @Input() label = 'Action in ';
  @Input() icon = '';
  @Input() cancelledLabel = 'OK';
  @Input() disabled = false;
  readonly nextPoint = output<void>();

  private timer: ReturnType<typeof setInterval> | null = null;
  protected timeLeft = signal<number>(this.period ?? 5);
  protected cancelled = signal<boolean>(false);

  constructor() {}

  ngOnInit() {
    this.timeLeft.update(() => (isNaN(this.period) ? 5 : this.period / 1000));
    this.timer = setInterval(() => {
      this.timeLeft.update((current) => --current);
      if (this.timeLeft() === 0) {
        this.disabled = true;
        this.action();
        if (this.timer) {
          clearInterval(this.timer);
        }
        this.timer = null;
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  cancel() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.cancelled.set(true);
  }

  action() {
    this.nextPoint.emit();
  }
}
