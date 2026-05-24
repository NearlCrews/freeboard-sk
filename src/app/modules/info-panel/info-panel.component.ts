import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InfoPanelFacade } from './info-panel.facade';

const TYPE_LABEL: Record<string, string> = {
  notes: 'Note',
  routes: 'Route',
  waypoints: 'Waypoint',
  regions: 'Region',
  charts: 'Chart',
  tracks: 'Track'
};

@Component({
  selector: 'info-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="info-panel">
      <header class="info-bar">
        <span class="info-bar-label">{{ label() }}</span>
        <button
          mat-icon-button
          (click)="close()"
          matTooltip="Close panel"
          aria-label="Close panel"
        >
          <mat-icon>close</mat-icon>
        </button>
      </header>
      <div class="info-body">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .info-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .info-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      padding: 8px 6px 8px 14px;
      border-bottom: 1.5px solid var(--mat-sys-outline-variant, #b8b8b8);
      background: var(--mat-sys-surface, #ffffff);
      min-height: 44px;
    }

    .info-bar-label {
      font: 700 13px/1 Roboto, system-ui, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--mat-sys-on-surface-variant, #2e2e2e);
    }

    .info-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }
  `,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule]
})
export class InfoPanelComponent {
  protected infoPanel = inject(InfoPanelFacade);

  protected label = () => {
    const type = this.infoPanel.item()?.type;
    return type ? TYPE_LABEL[type] ?? type : '';
  };

  close() {
    this.infoPanel.close();
  }
}
