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
      /* 8px 6px 8px 14px: 8 = --space-sm, 6 and 14 are off-grid (no clean
         token step). Left over from the original info-bar geometry; leaving
         literal to avoid drift until --space-2xs (4px) and --space-pad
         (14px) tokens exist. */
      padding: 8px 6px 8px 14px;
      border-bottom: 1.5px solid var(--color-border);
      background: var(--color-surface);
      min-height: var(--touch-secondary);
    }

    .info-bar-label {
      font-family: var(--font-family-sans);
      font-weight: var(--font-weight-bold);
      /* 13px is between --font-size-xs (12px) and --font-size-sm (14px).
         Kept literal to preserve the existing label sizing. */
      font-size: 13px;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    .info-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }

    /* WCAG 2.5.5 secondary touch-target floor (44px). Material's
       mat-icon-button defaults to 40px. */
    .info-bar button[mat-icon-button] {
      min-width: var(--touch-secondary);
      min-height: var(--touch-secondary);
    }
  `,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule]
})
export class InfoPanelComponent {
  protected infoPanel = inject(InfoPanelFacade);

  protected label = () => {
    const type = this.infoPanel.item()?.type;
    return type ? (TYPE_LABEL[type] ?? type) : '';
  };

  close() {
    this.infoPanel.close();
  }
}
