import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  contentChild,
  input
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

/**
 * Tier-2 primitive: scrollable detail view in a 3-pane layout.
 *
 * Slots:
 *   <ng-template fbDetailPaneHeader>...</ng-template>    optional header overlay
 *   default <ng-content>                                  the detail body
 *   <ng-template fbDetailPaneActions>...</ng-template>   action row pinned bottom
 *
 * Inputs `title` and `subtitle` render a default header layout above the
 * body; the `fbDetailPaneHeader` template, when supplied, replaces that
 * default entirely so consumers can render a custom title row (tabs,
 * breadcrumbs, etc.). When `title`, `subtitle`, projected content, and the
 * actions slot are all empty, the pane renders a centered, muted "No
 * selection" empty state so the 3-pane shell never collapses into nothing.
 */
@Component({
  selector: 'fb-detail-pane',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    @if (headerTpl()) {
      <header class="fb-detail-pane__header fb-detail-pane__header--custom">
        <ng-container [ngTemplateOutlet]="headerTpl()!"></ng-container>
      </header>
    } @else if (title() || subtitle()) {
      <header class="fb-detail-pane__header">
        @if (title()) {
          <h2 class="fb-detail-pane__title">{{ title() }}</h2>
        }
        @if (subtitle()) {
          <p class="fb-detail-pane__subtitle">{{ subtitle() }}</p>
        }
      </header>
    }
    <section class="fb-detail-pane__body">
      <ng-content></ng-content>
    </section>
    <div class="fb-detail-pane__empty" role="status" aria-live="polite">
      No selection
    </div>
    @if (actionsTpl()) {
      <footer class="fb-detail-pane__actions">
        <ng-container [ngTemplateOutlet]="actionsTpl()!"></ng-container>
      </footer>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
        background: var(--ds-surface-2, var(--color-surface-raised));
        color: var(--color-text);
        font-family: var(--font-family-sans);
      }
      .fb-detail-pane__header {
        padding: var(--space-lg) var(--space-xl);
        border-bottom: 1px solid var(--color-border);
        flex: 0 0 auto;
      }
      .fb-detail-pane__header--custom {
        padding: 0;
      }
      .fb-detail-pane__title {
        margin: 0;
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-medium);
        line-height: var(--line-height-tight);
        color: var(--color-text);
      }
      .fb-detail-pane__subtitle {
        margin: var(--space-xs) 0 0;
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
      }
      .fb-detail-pane__body {
        padding: var(--space-lg) var(--space-xl);
        overflow-y: auto;
        flex: 1 1 auto;
        font-size: var(--font-size-base);
        line-height: var(--line-height-normal);
      }
      .fb-detail-pane__body:empty {
        padding: 0;
      }
      :host {
        position: relative;
      }
      .fb-detail-pane__empty {
        display: none;
        position: absolute;
        inset: 0;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted);
        font-size: var(--font-size-base);
        pointer-events: none;
      }
      /*
       * Show empty state only when there is no header, no projected body
       * content, and no actions slot. :has() + :empty keeps the gate purely
       * declarative so OnPush detection doesn't have to recompute it.
       */
      :host:not(:has(.fb-detail-pane__header)):not(
          :has(.fb-detail-pane__actions)
        )
        .fb-detail-pane__body:empty
        ~ .fb-detail-pane__empty {
        display: flex;
      }
      .fb-detail-pane__actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-sm);
        padding: var(--space-md) var(--space-xl);
        border-top: 1px solid var(--color-border);
        background: var(--ds-surface-1, var(--color-surface));
        flex: 0 0 auto;
      }
    `
  ]
})
export class FbDetailPaneComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string | null>(null);

  readonly headerTpl = contentChild<TemplateRef<unknown>>('fbDetailPaneHeader');
  readonly actionsTpl = contentChild<TemplateRef<unknown>>(
    'fbDetailPaneActions'
  );
}
