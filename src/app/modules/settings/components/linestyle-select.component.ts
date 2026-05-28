import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  output
} from '@angular/core';
import { AppFacade } from 'src/app/app.facade';
import { SettingsStore } from 'src/app/stores';
import {
  FbInputComponent,
  FbSelectComponent,
  FbSelectOptionTemplateDirective,
  FbSelectTriggerDirective,
  type FbSelectOption
} from 'src/app/design-system/primitives';

export interface LineStyleDef {
  fill: { color: string };
  stroke: {
    color: string;
    width: number;
    lineDash: number[] | null;
  };
}

export interface LineStyleConfig {
  color: string;
  weight: number;
  dash: string;
}

export type LineStyleDash = 'none' | 'short' | 'medium' | 'long' | 'alt';

@Component({
  selector: 'linestyle-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbInputComponent,
    FbSelectComponent,
    FbSelectOptionTemplateDirective,
    FbSelectTriggerDirective
  ],
  template: `
    <div style="display:flex; gap: var(--space-sm);">
      <div style="width: 100px;">
        <fb-input
          name="linestyle-color"
          type="color"
          ariaLabel="Line color"
          [value]="_color()"
          (valueChange)="onColorChange($event)"
        ></fb-input>
      </div>
      <div style="width: 110px;">
        <fb-select
          name="linestyle-weight"
          ariaLabel="Line weight"
          [options]="weightOptions"
          [(value)]="_weight"
          (valueChange)="onSelectChange({ key: 'weight', value: $event })"
        >
          <div fb-select-trigger style="display: flex; align-items: center;">
            <svg width="48" height="10" style="vertical-align: middle;">
              <line
                x1="0"
                y1="5"
                x2="48"
                y2="5"
                stroke="currentColor"
                [attr.stroke-width]="_weight()"
              />
            </svg>
          </div>
          <ng-template fbSelectOption let-opt>
            <svg width="48" height="10" style="vertical-align: middle;">
              <line
                x1="0"
                y1="5"
                x2="48"
                y2="5"
                stroke="currentColor"
                [attr.stroke-width]="opt.id"
              />
            </svg>
          </ng-template>
        </fb-select>
      </div>
      <div style="width: 110px;">
        <fb-select
          name="linestyle-dash"
          ariaLabel="Line style"
          [options]="dashOptions"
          [(value)]="_dash"
          (valueChange)="onSelectChange({ key: 'dash', value: $event })"
        >
          <div fb-select-trigger style="display: flex; align-items: center;">
            <svg width="48" height="10" style="vertical-align: middle;">
              <line
                x1="0"
                y1="5"
                x2="48"
                y2="5"
                stroke="currentColor"
                stroke-width="2"
                [attr.stroke-dasharray]="line.dashArrays.get(_dash() ?? 'none')"
              />
            </svg>
          </div>
          <ng-template fbSelectOption let-opt>
            <svg width="48" height="10" style="vertical-align: middle;">
              <line
                x1="0"
                y1="5"
                x2="48"
                y2="5"
                stroke="currentColor"
                stroke-width="2"
                [attr.stroke-dasharray]="line.dashArrays.get(opt.id)"
              />
            </svg>
          </ng-template>
        </fb-select>
      </div>
    </div>
  `,
  styles: []
})
export class LineStyleSelectComponent implements OnInit {
  color = input<string>('#ff0000');
  dash = input<LineStyleDash>('none');
  weight = input<number>(1);

  _color = linkedSignal(() => this.color());
  _dash = linkedSignal<LineStyleDash | null>(() => this.dash());
  _weight = linkedSignal<number | null>(() => this.weight());

  selectionChange = output<{
    lineStyle: LineStyleDef;
    config: LineStyleConfig;
  }>();

  app = inject<AppFacade>(AppFacade);
  private settings = inject(SettingsStore);

  protected line = {
    dashArrays: this.settings.lineDashMap,
    weights: [1, 2, 3, 4, 5]
  };

  protected readonly weightOptions: readonly FbSelectOption<number>[] = [
    { id: 1, label: '1 px' },
    { id: 2, label: '2 px' },
    { id: 3, label: '3 px' },
    { id: 4, label: '4 px' },
    { id: 5, label: '5 px' }
  ];

  protected readonly dashOptions: readonly FbSelectOption<string>[] = [
    { id: 'none', label: 'Solid' },
    { id: 'short', label: 'Short dashes' },
    { id: 'medium', label: 'Medium dashes' },
    { id: 'long', label: 'Long dashes' },
    { id: 'alt', label: 'Alternating' }
  ];

  constructor() {}

  ngOnInit() {}

  onColorChange(value: string): void {
    this._color.set(value);
    this.onSelectChange({ key: 'color', value });
  }

  onSelectChange(_opt: { key: string; value: unknown }): void {
    const dashKey = (this._dash() ?? 'none') as LineStyleDash;
    const d = this.settings.formatLineDashArray(dashKey);
    const weightValue = this._weight() ?? 1;

    this.selectionChange.emit({
      lineStyle: {
        fill: { color: this._color() },
        stroke: {
          color: this._color(),
          width: weightValue,
          lineDash: d
        }
      },
      config: {
        color: this._color(),
        weight: weightValue,
        dash: dashKey
      }
    });
  }
}
