import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FbIconRegistry } from './icon-registry.service';

export type FbIconSize = 'sm' | 'md' | 'lg';
export type FbIconWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700;
export type FbIconFill = 0 | 1;

/**
 * Tier-1 Icon primitive.
 *
 * Renders either a Material Symbols ligature (via the `name` input) or
 * a registered SVG asset (via the `svgName` input). When `svgName` is
 * set it takes precedence and the SVG is inlined into the host so it
 * inherits `currentColor`. SVG assets are resolved through
 * `FbIconRegistry`, which is populated at app startup in
 * `AppFacade.initAppIcons` by registering each known svgName with its
 * asset URL.
 *
 * A11y posture:
 *  - When `ariaLabel` is provided, the host element gets `role="img"` and
 *    the label, so screen readers announce the icon as an image with the
 *    given name.
 *  - When `ariaLabel` is absent, the host element is `aria-hidden="true"`
 *    so screen readers skip what is purely decorative.
 *
 * Sizing via the `size` input maps to fixed-size hosts (24px md, 32px lg,
 * or 1em sm for inline use inside copy). The internal glyph / SVG fills
 * the host.
 */
@Component({
  selector: 'fb-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (svgName()) {
      <span class="fb-icon__svg" aria-hidden="true"></span>
    } @else {
      <span class="fb-icon__glyph material-icons" aria-hidden="true">{{
        name()
      }}</span>
    }
  `,
  host: {
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
      .fb-icon__svg {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }
      .fb-icon__svg ::ng-deep svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
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
  readonly name = input<string>('');
  readonly svgName = input<string>('');
  readonly size = input<FbIconSize>('md');
  readonly ariaLabel = input<string>('');
  readonly weight = input<FbIconWeight>(400);
  readonly fill = input<FbIconFill>(0);

  readonly roleAttr = computed(() => (this.ariaLabel() ? 'img' : null));
  readonly ariaLabelAttr = computed(() => this.ariaLabel() || null);
  readonly ariaHiddenAttr = computed(() => (this.ariaLabel() ? null : 'true'));

  readonly variationSettings = computed(
    () => `'FILL' ${this.fill()}, 'wght' ${this.weight()}`
  );

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly registry = inject(FbIconRegistry);

  constructor() {
    let initialized = false;
    afterNextRender(() => {
      initialized = true;
      this.renderSvg();
    });
    effect(() => {
      this.svgName();
      if (initialized) {
        this.renderSvg();
      }
    });
  }

  private renderSvg(): void {
    const id = this.svgName();
    const slot =
      this.host.nativeElement.querySelector<HTMLElement>('.fb-icon__svg');
    if (!slot) {
      return;
    }
    slot.replaceChildren();
    if (!id) {
      return;
    }
    this.registry
      .getNamedSvgIcon(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (svg) => {
          if (this.svgName() !== id) {
            return;
          }
          slot.replaceChildren(svg.cloneNode(true));
        },
        error: () => {
          // Registered svgIcon names that fail to resolve (unregistered
          // id, asset 404) leave the slot empty rather than crashing the
          // host. AppFacade.initAppIcons logs the registration failures
          // at startup.
        }
      });
  }
}
