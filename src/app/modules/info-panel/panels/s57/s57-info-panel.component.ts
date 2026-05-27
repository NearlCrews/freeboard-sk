import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';

import {
  FbInfoPanelLayoutComponent,
  FbInfoPanelIconDirective,
  FbInfoPanelTitleDirective,
  FbInfoPanelMetaDirective,
  FbInfoPanelBodyDirective
} from 'src/app/modules/info-panel/layout';
import { FbIconComponent } from 'src/app/design-system/primitives/icon/icon.component';
import { S57_NAMES } from 'src/app/modules/map/popovers/s57-consts';

type S57Properties = Record<string, unknown>;

@Component({
  selector: 'fb-s57-info-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbInfoPanelLayoutComponent,
    FbInfoPanelIconDirective,
    FbInfoPanelTitleDirective,
    FbInfoPanelMetaDirective,
    FbInfoPanelBodyDirective,
    FbIconComponent
  ],
  template: `
    <fb-info-panel-layout [ariaLabel]="ariaLabel()">
      <fb-icon fbInfoPanelIcon name="layers"></fb-icon>
      <ng-container fbInfoPanelTitle>{{ title() }}</ng-container>

      <ng-container fbInfoPanelMeta>
        @if (objectClassCode(); as code) {
          <span class="pill">{{ code }}</span>
        }
      </ng-container>

      <div fbInfoPanelBody>
        @if (entries().length === 0) {
          <p class="s57-empty">No details available.</p>
        } @else {
          <dl class="s57-props">
            @for (entry of entries(); track entry[0]) {
              <dt>{{ entry[0] }}</dt>
              <dd>{{ entry[1] }}</dd>
            }
          </dl>
        }
      </div>
    </fb-info-panel-layout>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .s57-props {
      display: grid;
      grid-template-columns: minmax(110px, max-content) 1fr;
      gap: 0;
      margin: 0;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .s57-props dt,
    .s57-props dd {
      margin: 0;
      padding: var(--space-sm) var(--space-md);
      border-bottom: 1px solid var(--color-border);
      line-height: var(--line-height-tight);
    }

    .s57-props dt {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      background: var(--color-surface);
      letter-spacing: 0.02em;
    }

    .s57-props dd {
      background: var(--color-surface-raised);
      color: var(--color-text);
      overflow-wrap: anywhere;
    }

    .s57-props > dt:nth-last-of-type(1),
    .s57-props > dd:last-of-type {
      border-bottom: 0;
    }

    .s57-empty {
      color: var(--color-text-muted);
      margin: 0;
    }
  `
})
export class S57InfoPanelComponent {
  readonly properties = input.required<S57Properties>();
  readonly titleOverride = input<string>('');

  protected readonly objectClassCode = computed<string>(() => {
    const layer = this.properties()['layer'];
    return typeof layer === 'string' ? layer : '';
  });

  protected readonly title = computed<string>(() => {
    const override = this.titleOverride();
    if (override) return override;
    const code = this.objectClassCode();
    const name = this.properties()['OBJNAM'];
    if (typeof name === 'string' && name) return name;
    if (code && S57_NAMES[code]) return S57_NAMES[code];
    return code || 'Chart feature';
  });

  protected readonly ariaLabel = computed<string>(
    () => `Chart feature ${this.title()}`
  );

  protected readonly entries = computed<readonly [string, string][]>(() => {
    const props = this.properties();
    const out: [string, string][] = [];
    for (const [key, raw] of Object.entries(props)) {
      if (raw === undefined || raw === null || raw === '') continue;
      out.push([key, this.stringify(raw)]);
    }
    return out;
  });

  private stringify(val: unknown): string {
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) return val.map((v) => this.stringify(v)).join(', ');
    if (val && typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return '';
      }
    }
    return String(val);
  }
}
