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
} from 'src/app/modules/info-panel/layout';
import { FbIconComponent } from 'src/app/design-system/primitives/icon/icon.component';
import {
  FbNavListComponent,
  FbListItemComponent
} from 'src/app/design-system/primitives/list/list.component';
import type { SKResourceType } from 'src/app/modules/skresources';

export interface FeatureListEntry {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly type?: SKResourceType;
}

@Component({
  selector: 'fb-featurelist-info-panel',
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
      <fb-icon fbInfoPanelIcon name="list_alt"></fb-icon>
      <ng-container fbInfoPanelTitle>{{ title() }}</ng-container>

      <ng-container fbInfoPanelMeta>
        <span class="pill group"
          ><span class="dot"></span>{{ features().length }}</span
        >
      </ng-container>

      <div fbInfoPanelBody class="ip-featurelist">
        @if (features().length === 0) {
          <p class="empty">No features at this point.</p>
        } @else {
          <fb-nav-list ariaLabel="Features at click point">
            @for (f of features(); track f.id) {
              <fb-list-item interactive (activated)="handleSelect(f)">
                @if (f.icon) {
                  <fb-icon fbListItemLeading [name]="f.icon"></fb-icon>
                }
                {{ f.label }}
                @if (f.type) {
                  <span fbListItemTrailing class="type-badge">{{
                    f.type
                  }}</span>
                }
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

    .ip-featurelist .empty {
      color: var(--color-text-muted);
      margin: 0;
    }

    /* Compact trailing-tag inside list rows. Shares the pill geometry
       used by metadata pills in the panel meta row but renders smaller
       (xs font, uppercase) so it reads as a typed-tag label, not a
       headline pill. Kept local to this component because it's the only
       list-item trailing tag in the app right now; promote to a shared
       primitive when a second consumer shows up. */
    .type-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px var(--space-sm);
      border-radius: var(--radius-pill);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border: 1px solid var(--color-border);
      background: var(--color-surface-raised);
      color: var(--color-text-muted);
    }
  `
})
export class FeaturelistInfoPanelComponent {
  readonly features = input.required<readonly FeatureListEntry[]>();
  readonly titleOverride = input<string>('');

  readonly selected = output<{ id: string; type?: SKResourceType }>();

  protected readonly title = computed<string>(
    () => this.titleOverride() || 'Multiple features at this point'
  );

  protected readonly ariaLabel = computed<string>(() => this.title());

  handleSelect(entry: FeatureListEntry): void {
    const payload: { id: string; type?: SKResourceType } = { id: entry.id };
    if (entry.type) {
      payload.type = entry.type;
    }
    this.selected.emit(payload);
  }
}
