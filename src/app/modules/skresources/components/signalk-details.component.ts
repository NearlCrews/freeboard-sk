import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  OnChanges
} from '@angular/core';

import { FbTooltipDirective } from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import { CoordsPipe } from '../../../lib/pipes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DetailsTree = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlatEntry = [string, any];
// [depth, label, value | null]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SectionedItem = [number, string, any];

@Component({
  selector: 'signalk-details-list',
  imports: [CoordsPipe, FbTooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./signalk-details.component.css'],
  template: `
    <div class="sk-details">
      <div class="title">
        <div>{{ title() }}</div>
      </div>
      <div class="content">
        @for (item of items; track item) {
          <div class="item">
            @if (item[0] === 0 && item[2] === null) {
              <span class="sectionname">{{ item[1] }}</span>
            }
            @if (item[2] !== null) {
              <div class="pathvalue">
                <div class="path" [fbTooltip]="item[1]">{{ item[1] }}</div>
                @if (item[1] === 'latitude') {
                  <div class="value" [fbTooltip]="item[2]">
                    {{
                      item[2] | coords: app.config.units.positionFormat : true
                    }}
                  </div>
                } @else if (item[1] === 'longitude') {
                  <div class="value" [fbTooltip]="item[2]">
                    {{
                      item[2] | coords: app.config.units.positionFormat : false
                    }}
                  </div>
                } @else {
                  <div class="value" [fbTooltip]="item[2]">{{ item[2] }}</div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class SignalKDetailsComponent implements OnChanges {
  title = input<string>('');
  details = input<DetailsTree | undefined>();
  public items: SectionedItem[] = [];

  protected app = inject(AppFacade);

  constructor() {}

  ngOnChanges() {
    const d = this.details();
    if (d) {
      this.parseEntries(d);
    } else {
      this.items = [];
    }
  }

  // ** parse items
  parseEntries(details: DetailsTree) {
    const u = Object.entries(details);
    u.sort((a, b) => {
      return a[0] < b[0] ? -1 : 1;
    });
    this.items = this.section(this.flatten(u));
  }

  private section(u: FlatEntry[]): SectionedItem[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: [number, string, string, any][] = [];
    u.forEach((i) => {
      const p = i[0].split('.');
      if (p.length === 1) {
        result.push([
          0,
          '',
          p[0] ?? '',
          typeof i[1] !== 'object' ? i[1] : null
        ]);
      } else {
        const pp = p.slice(0, p.length - 1).join('.');
        result.push([p.length - 1, pp, p[p.length - 1] ?? '', i[1]]);
      }
    });
    // ** sort **
    result.sort((a, b) => {
      return a[1] < b[1] ? -1 : 1;
    });
    let prevParent: string | null = null;
    const processedParents: string[] = [];
    const out: SectionedItem[] = [];
    result.forEach((i) => {
      if (i[1] !== prevParent) {
        prevParent = i[1];
        if (!processedParents.includes(i[1])) {
          processedParents.push(i[1]);
          out.push([0, i[1], null]);
        }
      }
      out.push([i[0], i[2], i[3]]);
    });
    return out;
  }

  // ** flatten object values to .paths **
  private flatten(u: FlatEntry[]): FlatEntry[] {
    let paths: FlatEntry[] = [];
    u.forEach((i) => {
      if (typeof i[1] === 'object' && i[1] !== null) {
        paths = paths.concat(this.processObject(i[0], i[1]));
      } else {
        paths.push([i[0], i[1]]);
      }
    });
    return paths;
  }

  // ** process object values **
  private processObject(parent: string, obj: DetailsTree): FlatEntry[] {
    let paths: FlatEntry[] = [];
    const u = Object.entries(obj);
    u.sort((a, b) => {
      return a[0] < b[0] ? -1 : 1;
    });
    u.forEach((i) => {
      if (typeof i[1] === 'object' && i[1] !== null) {
        paths = paths.concat(this.processObject(parent + '.' + i[0], i[1]));
      } else {
        paths.push([parent + '.' + i[0], i[1]]);
      }
    });
    return paths;
  }
}
