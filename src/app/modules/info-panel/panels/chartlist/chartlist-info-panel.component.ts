import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';

import {
  FbInfoPanelLayoutComponent,
  FbInfoPanelIconDirective,
  FbInfoPanelTitleDirective,
  FbInfoPanelMetaDirective,
  FbInfoPanelBodyDirective
} from 'src/app/modules/info-panel/layout/info-panel-layout.component';
import { FbIconComponent } from 'src/app/design-system/primitives/icon/icon.component';
import {
  FbNavListComponent,
  FbListItemComponent
} from 'src/app/design-system/primitives/list/list.component';

export interface ChartListEntry {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'fb-chartlist-info-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbInfoPanelLayoutComponent,
    FbInfoPanelIconDirective,
    FbInfoPanelTitleDirective,
    FbInfoPanelMetaDirective,
    FbInfoPanelBodyDirective,
    FbIconComponent,
    FbNavListComponent,
    FbListItemComponent
  ],
  template: `
    <fb-info-panel-layout [ariaLabel]="ariaLabel()">
      <fb-icon fbInfoPanelIcon name="map"></fb-icon>
      <ng-container fbInfoPanelTitle>{{ title() }}</ng-container>

      <ng-container fbInfoPanelMeta>
        <span class="pill group"
          ><span class="dot"></span>{{ features().length }}</span
        >
      </ng-container>

      <div fbInfoPanelBody class="ip-chartlist">
        @if (features().length === 0) {
          <p class="empty">No charts at this point.</p>
        } @else {
          <fb-nav-list ariaLabel="Charts at click point">
            @for (c of features(); track c.id) {
              <fb-list-item interactive (activated)="handleSelect(c)">
                <fb-icon fbListItemLeading name="map"></fb-icon>
                {{ c.label }}
              </fb-list-item>
            }
          </fb-nav-list>
        }
      </div>
    </fb-info-panel-layout>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .ip-chartlist .empty {
      color: var(--color-text-muted);
      margin: 0;
    }
  `
})
export class ChartlistInfoPanelComponent {
  readonly features = input.required<readonly ChartListEntry[]>();
  readonly titleOverride = input<string>('');

  readonly selected = output<{ id: string; selected: boolean }>();

  protected readonly title = computed<string>(
    () => this.titleOverride() || 'Charts at this point'
  );

  protected readonly ariaLabel = computed<string>(() => this.title());

  handleSelect(entry: ChartListEntry): void {
    this.selected.emit({ id: entry.id, selected: true });
  }
}
