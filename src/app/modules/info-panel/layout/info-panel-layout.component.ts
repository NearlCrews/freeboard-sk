import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  input
} from '@angular/core';

@Directive({ selector: '[fbInfoPanelIcon]', standalone: true })
export class FbInfoPanelIconDirective {}

@Directive({ selector: '[fbInfoPanelTitle]', standalone: true })
export class FbInfoPanelTitleDirective {}

@Directive({ selector: '[fbInfoPanelMeta]', standalone: true })
export class FbInfoPanelMetaDirective {}

@Directive({ selector: '[fbInfoPanelActions]', standalone: true })
export class FbInfoPanelActionsDirective {}

@Directive({ selector: '[fbInfoPanelBody]', standalone: true })
export class FbInfoPanelBodyDirective {}

@Directive({ selector: '[fbInfoPanelRelated]', standalone: true })
export class FbInfoPanelRelatedDirective {}

@Component({
  selector: 'fb-info-panel-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="ip-layout"
      role="region"
      [attr.aria-label]="ariaLabel() || null"
    >
      <header class="ip-head">
        <div class="ip-head-row">
          <div class="ip-icon" aria-hidden="true">
            <ng-content select="[fbInfoPanelIcon]"></ng-content>
          </div>
          <div class="ip-title-block">
            <h1 class="ip-title">
              <ng-content select="[fbInfoPanelTitle]"></ng-content>
            </h1>
            <div class="ip-meta">
              <ng-content select="[fbInfoPanelMeta]"></ng-content>
            </div>
          </div>
        </div>
      </header>

      <nav class="ip-actions" aria-label="Actions">
        <ng-content select="[fbInfoPanelActions]"></ng-content>
      </nav>

      <div class="ip-body">
        <ng-content select="[fbInfoPanelBody]"></ng-content>
        <ng-content></ng-content>
      </div>

      <div class="ip-related">
        <ng-content select="[fbInfoPanelRelated]"></ng-content>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
    }

    .ip-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--color-bg);
      color: var(--color-text);
      position: relative;
    }

    .ip-head {
      padding: var(--space-xl) var(--space-xl) var(--space-lg);
      border-bottom: 1.5px solid var(--color-border);
      background: var(--color-surface);
    }

    .ip-head-row {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
    }

    .ip-icon {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-xl);
      background: var(--color-surface-raised);
      color: var(--color-primary);
    }

    .ip-icon:empty {
      display: none;
    }

    .ip-icon ::ng-deep mat-icon,
    .ip-icon ::ng-deep fb-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
    }

    .ip-title-block {
      flex: 1;
      min-width: 0;
    }

    .ip-title {
      margin: 0 0 var(--space-md);
      font: var(--font-weight-bold) var(--font-size-2xl) /
        var(--line-height-tight) var(--font-family-sans);
      letter-spacing: -0.015em;
      color: var(--color-text);
      overflow-wrap: break-word;
      hyphens: auto;
      -webkit-hyphens: auto;
    }

    .ip-title:empty {
      margin: 0;
    }

    .ip-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .ip-meta:empty {
      display: none;
    }

    /* min-height pins the box so xs-font badges (draft, warn, alarm)
       match sm-font default pills in a mixed row. */
    :host ::ng-deep .ip-meta > .pill {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      min-height: 28px;
      padding: 0 var(--space-md);
      border-radius: var(--radius-pill);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      line-height: 1.4;
      border: 1.5px solid var(--color-border);
      background: var(--color-surface-raised);
      color: var(--color-text-muted);
    }

    :host ::ng-deep .ip-meta > .pill fb-icon,
    :host ::ng-deep .ip-meta > .pill mat-icon {
      font-size: var(--font-size-sm);
      width: var(--font-size-sm);
      height: var(--font-size-sm);
    }

    :host ::ng-deep .ip-meta > .pill.pos {
      font-family: var(--font-family-mono);
      letter-spacing: 0.02em;
      background: var(--color-surface);
      color: var(--color-primary);
      border-color: var(--color-primary);
    }

    :host ::ng-deep .ip-meta > .pill.draft,
    :host ::ng-deep .ip-meta > .pill.warn {
      border-color: var(--color-warning);
      background: var(--color-warning);
      color: var(--color-text-inverse);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: var(--font-size-xs);
    }

    :host ::ng-deep .ip-meta > .pill.alarm {
      border-color: var(--color-error);
      background: var(--color-error);
      color: var(--color-text-inverse);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: var(--font-size-xs);
    }

    :host ::ng-deep .ip-meta > .pill.group {
      --pill-color: var(--color-text-muted);
      color: var(--pill-color);
      border-color: var(--pill-color);
    }

    :host ::ng-deep .ip-meta > .pill.group .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--pill-color);
    }

    .ip-actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg);
    }

    .ip-actions:empty {
      display: none;
    }

    .ip-actions ::ng-deep .action-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-sm);
    }

    .ip-actions ::ng-deep .action-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-sm);
    }

    /* The touch floor lives on the inner button, not the host wrapper:
       a 44px host around a 36px sm button leaves a dead 8px click strip. */
    .ip-actions ::ng-deep .action-grid > fb-button,
    .ip-actions ::ng-deep .action-grid-3 > fb-button {
      width: 100%;
    }
    .ip-actions ::ng-deep .action-grid > fb-button button.fb-btn,
    .ip-actions ::ng-deep .action-grid-3 > fb-button button.fb-btn {
      width: 100%;
      min-height: var(--touch-secondary);
      justify-content: flex-start;
      padding-left: var(--space-md);
      padding-right: var(--space-md);
    }

    /* Read-only state: when the meta row shows the "Read only" pill, the
       mutating action buttons (Edit, Add Note, Delete) are also passed
       disabled by the panel. The disabled appearance comes from
       fb-button itself (opacity 0.55) so no extra styling needed here.
       The pill in the meta row is the textual indicator. */

    .ip-body {
      flex: 1 1 auto;
      min-height: 0;
      padding: var(--space-lg) var(--space-xl) var(--space-2xl);
      overflow-y: auto;
      font-family: var(--font-family-sans);
      font-size: var(--font-size-base);
      line-height: var(--line-height-normal);
      color: var(--color-text);
    }

    .ip-body > :first-child,
    .ip-body > :first-child > :first-child {
      margin-top: 0;
    }

    /* Term-value grid available to any future panel that wants one.
       Resource panels currently use just the description and the
       attribution footer below since duplicating header chrome (name,
       position, link) is noise. The dt and dd share the same font-size
       so baseline alignment lines them up correctly. */
    :host ::ng-deep .ip-body .ip-props {
      display: grid;
      grid-template-columns: max-content 1fr;
      column-gap: var(--space-md);
      row-gap: var(--space-xs);
      margin: var(--space-lg) 0 0;
      padding-top: var(--space-md);
      border-top: 1px solid var(--color-border);
      font-size: var(--font-size-sm);
    }
    :host ::ng-deep .ip-body .ip-props dt {
      color: var(--color-text-muted);
      font-weight: var(--font-weight-medium);
      letter-spacing: 0.02em;
      text-transform: uppercase;
      font-size: var(--font-size-sm);
      line-height: var(--line-height-normal);
      align-self: start;
    }
    :host ::ng-deep .ip-body .ip-props dd {
      margin: 0;
      color: var(--color-text);
      word-break: break-word;
      font-family: var(--font-family-sans);
      font-size: var(--font-size-sm);
      line-height: var(--line-height-normal);
      align-self: start;
    }
    :host ::ng-deep .ip-body .ip-props dd a {
      color: var(--color-primary);
      text-decoration: none;
    }
    :host ::ng-deep .ip-body .ip-props dd a:hover {
      text-decoration: underline;
    }

    /* Placeholder when the resource has no description. Reads as muted
       guidance, not error or warning. */
    :host ::ng-deep .ip-body .ip-empty {
      margin: 0;
      padding: var(--space-md);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text-muted);
      font-style: italic;
      font-size: var(--font-size-sm);
    }

    /* Small attribution line at the bottom of the body: "Source:
       <plugin-name>" linked to the plugin's npm page. Quiet typography,
       hairline separator so it reads as a footnote rather than chrome. */
    :host ::ng-deep .ip-body .ip-attribution {
      margin: var(--space-lg) 0 0;
      padding-top: var(--space-sm);
      border-top: 1px solid var(--color-border);
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      letter-spacing: 0.02em;
    }
    :host ::ng-deep .ip-body .ip-attribution a {
      color: var(--color-primary);
      text-decoration: none;
      font-family: var(--font-family-mono);
    }
    :host ::ng-deep .ip-body .ip-attribution a:hover {
      text-decoration: underline;
    }

    .ip-related {
      flex-shrink: 0;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .ip-related:empty {
      display: none;
    }

    :host ::ng-deep .ip-body {
      :is(h1, h2, h3, h4) {
        font-family: var(--font-family-sans);
        color: var(--color-text);
        letter-spacing: -0.01em;
        margin: 1.4em 0 0.5em;
        line-height: 1.25;
      }
      h1 {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
      }
      h2 {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
      }
      h3 {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-bold);
      }
      h4 {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-bold);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-muted);
      }
      p {
        margin: 0 0 1em;
      }
      a,
      a:link,
      a:visited,
      a *,
      a:link *,
      a:visited * {
        color: var(--color-primary);
        font-weight: var(--font-weight-regular);
        text-decoration: none;
      }
      a:hover,
      a:hover * {
        color: var(--color-text);
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      code {
        font-family: var(--font-family-mono);
        font-size: var(--font-size-sm);
        background: var(--color-surface-raised);
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        color: var(--color-primary);
        font-weight: var(--font-weight-bold);
      }
      pre {
        background: var(--color-surface-raised);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: 12px 14px;
        overflow-x: auto;
        font: var(--font-size-sm) / var(--line-height-normal)
          var(--font-family-mono);
      }
      blockquote {
        margin: 1em 0;
        padding: 6px 0 6px 16px;
        border-left: 4px solid var(--color-primary);
        color: var(--color-text-muted);
        font-style: italic;
      }
      ul,
      ol {
        padding-left: 24px;
        margin: 0 0 1em;
      }
      hr {
        border: 0;
        border-top: 1px solid var(--color-border);
        margin: 1.4em 0;
      }
      img {
        max-width: 100%;
        border-radius: var(--radius-lg);
      }
    }
  `
})
export class FbInfoPanelLayoutComponent {
  readonly ariaLabel = input<string>('');
}
