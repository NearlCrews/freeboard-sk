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
  FbInfoPanelActionsDirective,
  FbInfoPanelBodyDirective
} from 'src/app/modules/info-panel/layout';
import { FbButtonComponent } from 'src/app/design-system/primitives/button/button.component';
import { FbIconComponent } from 'src/app/design-system/primitives/icon/icon.component';
import { ResourceSet } from 'src/app/types/resources/custom';

interface ResourcesetRecord extends ResourceSet {
  properties?: {
    name?: string | null;
    description?: string | null;
    source?: string | null;
    license?: string | null;
    [key: string]: unknown;
  };
}

@Component({
  selector: 'fb-resourceset-info-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbInfoPanelLayoutComponent,
    FbInfoPanelIconDirective,
    FbInfoPanelTitleDirective,
    FbInfoPanelMetaDirective,
    FbInfoPanelActionsDirective,
    FbInfoPanelBodyDirective,
    FbButtonComponent,
    FbIconComponent
  ],
  template: `
    <fb-info-panel-layout [ariaLabel]="ariaLabel()">
      <fb-icon fbInfoPanelIcon name="dataset"></fb-icon>
      <ng-container fbInfoPanelTitle>{{ title() }}</ng-container>

      <ng-container fbInfoPanelMeta>
        @if (typeLabel(); as t) {
          <span class="pill">{{ t }}</span>
        }
        @if (featureCount(); as n) {
          <span class="pill group"
            ><span class="dot"></span>{{ n }} features</span
          >
        }
      </ng-container>

      <ng-container fbInfoPanelActions>
        <div class="action-grid-3">
          <fb-button
            variant="secondary"
            size="sm"
            ariaLabel="Modify resource set"
            [disabled]="readOnly()"
            (pressed)="handleModify()"
          >
            Modify
          </fb-button>
          <fb-button
            variant="secondary"
            size="sm"
            ariaLabel="Show resource set properties"
            (pressed)="handleInfo()"
          >
            Info
          </fb-button>
          <fb-button
            variant="secondary"
            size="sm"
            ariaLabel="Center map on resource set"
            (pressed)="handlePanTo()"
          >
            Centre
          </fb-button>
        </div>
        <fb-button
          variant="danger"
          size="sm"
          ariaLabel="Delete resource set"
          [disabled]="readOnly()"
          (pressed)="handleDelete()"
        >
          Delete
        </fb-button>
      </ng-container>

      <div fbInfoPanelBody class="ip-rset">
        @if (descriptionText(); as desc) {
          <div class="row block">
            <span class="label">Description</span>
            <span class="value">{{ desc }}</span>
          </div>
        }
        @if (sourceText(); as src) {
          <div class="row">
            <span class="label">Source</span>
            <span class="value">{{ src }}</span>
          </div>
        }
        @if (licenseText(); as lic) {
          <div class="row">
            <span class="label">License</span>
            <span class="value">{{ lic }}</span>
          </div>
        }
        @if (!descriptionText() && !sourceText() && !licenseText()) {
          <p class="empty">No description available.</p>
        }
      </div>
    </fb-info-panel-layout>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .ip-rset .row {
      display: flex;
      justify-content: space-between;
      gap: var(--space-md);
      padding: var(--space-xs) 0;
      border-bottom: 1px solid var(--color-border);
    }

    .ip-rset .row.block {
      flex-direction: column;
      align-items: flex-start;
    }

    .ip-rset .row:last-of-type {
      border-bottom: 0;
    }

    .ip-rset .label {
      font-weight: var(--font-weight-bold);
      color: var(--color-text-muted);
    }

    .ip-rset .value {
      text-align: right;
      color: var(--color-text);
      overflow-wrap: anywhere;
    }

    .ip-rset .row.block .value {
      text-align: left;
    }

    .empty {
      color: var(--color-text-muted);
      margin: 0;
    }
  `
})
export class ResourcesetInfoPanelComponent {
  readonly resource = input.required<ResourcesetRecord>();
  readonly titleOverride = input<string>('');
  readonly readOnly = input<boolean>(false);

  readonly modify = output<void>();
  readonly delete = output<void>();
  readonly info = output<void>();
  readonly panTo = output<void>();

  protected readonly title = computed<string>(() => {
    const override = this.titleOverride();
    if (override) return override;
    const r = this.resource();
    return r.properties?.name || r.name || 'Resource set';
  });

  protected readonly ariaLabel = computed<string>(
    () => `Resource set ${this.title()}`
  );

  protected readonly typeLabel = computed<string>(() => this.resource().type);

  protected readonly featureCount = computed<number>(
    () => this.resource().values?.features?.length ?? 0
  );

  protected readonly descriptionText = computed<string>(() => {
    const r = this.resource();
    return r.properties?.description || r.description || '';
  });

  protected readonly sourceText = computed<string>(() => {
    const src = this.resource().properties?.source;
    return typeof src === 'string' ? src : '';
  });

  protected readonly licenseText = computed<string>(() => {
    const lic = this.resource().properties?.license;
    return typeof lic === 'string' ? lic : '';
  });

  handleModify(): void {
    this.modify.emit();
  }

  handleDelete(): void {
    this.delete.emit();
  }

  handleInfo(): void {
    this.info.emit();
  }

  handlePanTo(): void {
    this.panTo.emit();
  }
}
