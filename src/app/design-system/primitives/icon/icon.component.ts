import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';

export type FbIconSize = 'sm' | 'md' | 'lg';
export type FbIconWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700;
export type FbIconFill = 0 | 1;

/**
 * Tier-1 Icon primitive.
 *
 * Renders a single Material Symbols / Material Icons glyph. The
 * `.material-icons` font face ships with the app (subset under
 * font_resources/material/), and we drive optional axis values for weight
 * and fill via `font-variation-settings` so consumers can match emphasis
 * without swapping icon variants.
 *
 * A11y posture:
 *  - When `ariaLabel` is provided, the host element gets `role="img"` and
 *    the label, so screen readers announce the icon as an image with the
 *    given name.
 *  - When `ariaLabel` is absent, the host element is `aria-hidden="true"`
 *    so screen readers skip what is purely decorative. The glyph name in
 *    the ligature text is irrelevant for AT.
 *
 * Sizing maps to touch-target tokens so an icon used in isolation as a
 * tap target hits the 44 px / 56 px floors. `sm` keeps the glyph at the
 * surrounding line-height (`1em`) for inline use inside copy.
 */
@Component({
  selector: 'fb-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="fb-icon__glyph material-icons" aria-hidden="true">{{
    name()
  }}</span>`,
  host: {
    '[class]': 'classes()',
    '[attr.role]': 'roleAttr()',
    '[attr.aria-label]': 'ariaLabelAttr()',
    '[attr.aria-hidden]': 'ariaHiddenAttr()',
    '[attr.data-size]': 'size()',
    '[style.font-variation-settings]': 'variationSettings()'
  },
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        color: inherit;
      }
      .fb-icon__glyph {
        font-family: 'Material Icons';
        font-style: normal;
        font-weight: normal;
        letter-spacing: normal;
        text-transform: none;
        white-space: nowrap;
        direction: ltr;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        -moz-osx-font-smoothing: grayscale;
        font-feature-settings: 'liga';
        line-height: 1;
      }
      /* Icon hosts intrinsically size to the glyph. Touch-target floors are
         the surrounding control's job (fb-button, fb-list-item, etc.); an
         icon bigger than its container clips inside flex rows. */
      :host([data-size='sm']) {
        width: 1em;
        height: 1em;
        font-size: 1em;
      }
      :host([data-size='sm']) .fb-icon__glyph {
        font-size: 1em;
      }
      :host([data-size='md']) {
        width: 24px;
        height: 24px;
        font-size: 24px;
      }
      :host([data-size='md']) .fb-icon__glyph {
        font-size: 24px;
      }
      :host([data-size='lg']) {
        width: 32px;
        height: 32px;
        font-size: 32px;
      }
      :host([data-size='lg']) .fb-icon__glyph {
        font-size: 32px;
      }
    `
  ]
})
export class FbIconComponent {
  readonly name = input.required<string>();
  readonly size = input<FbIconSize>('md');
  readonly ariaLabel = input<string>('');
  readonly weight = input<FbIconWeight>(400);
  readonly fill = input<FbIconFill>(0);

  readonly classes = computed(() => `fb-icon fb-icon--${this.size()}`);

  readonly roleAttr = computed(() => (this.ariaLabel() ? 'img' : null));
  readonly ariaLabelAttr = computed(() => this.ariaLabel() || null);
  readonly ariaHiddenAttr = computed(() => (this.ariaLabel() ? null : 'true'));

  readonly variationSettings = computed(
    () => `'FILL' ${this.fill()}, 'wght' ${this.weight()}`
  );
}
