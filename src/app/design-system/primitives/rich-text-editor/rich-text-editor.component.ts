import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  signal,
  type OnDestroy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { Link } from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { TiptapEditorDirective } from 'ngx-tiptap';

import { FbButtonComponent } from '../button/button.component';
import { FbDividerComponent } from '../divider/divider.component';
import { FbIconComponent } from '../icon/icon.component';
import { FbInputComponent } from '../input/input.component';
import { FbTooltipDirective } from '../tooltip/tooltip.directive';

export interface FbRichTextSwatch {
  readonly label: string;
  readonly value: string | null;
}

// Default marine-leaning palette using design tokens so colors theme-switch
// with the host app. Consumers can override via the [palette] input.
export const FB_RICH_TEXT_DEFAULT_PALETTE: readonly FbRichTextSwatch[] = [
  { label: 'Default', value: null },
  { label: 'Danger', value: 'var(--color-error)' },
  { label: 'Caution', value: 'var(--color-warning)' },
  { label: 'Safe', value: 'var(--color-success)' },
  { label: 'Info', value: 'var(--color-primary)' }
];

// StarterKit 3.x bundles Underline and Link with defaults (openOnClick: true
// for Link). Disable them so the explicit extensions below are the only
// registrations: no duplicate-extension warnings, no double event handlers,
// and the openOnClick override actually applies.
const RICH_TEXT_EXTENSIONS = [
  StarterKit.configure({ underline: false, link: false }),
  Underline,
  TextStyle,
  Color,
  Link.configure({ openOnClick: false, autolink: true })
];

@Component({
  selector: 'fb-rich-text-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TiptapEditorDirective,
    FbButtonComponent,
    FbDividerComponent,
    FbIconComponent,
    FbInputComponent,
    FbTooltipDirective
  ],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss'
})
export class FbRichTextEditorComponent implements OnDestroy {
  readonly value = model<string>('');
  readonly palette = input<readonly FbRichTextSwatch[]>(
    FB_RICH_TEXT_DEFAULT_PALETTE
  );
  readonly ariaLabel = input<string>('Rich text editor');

  protected editor: Editor;

  // At most one popover open at a time.
  protected activePopover = signal<'color' | 'link' | null>(null);
  protected colorPickerOpen = computed(() => this.activePopover() === 'color');
  protected linkEditorOpen = computed(() => this.activePopover() === 'link');

  // Mirror of editor.isActive('link') so the Remove button updates reactively
  // when the caret moves into or out of a link mark.
  protected linkActive = signal(false);
  protected linkUrl = signal('');

  constructor() {
    this.editor = new Editor({
      extensions: RICH_TEXT_EXTENSIONS,
      content: this.value(),
      editorProps: {
        attributes: {
          'aria-label': this.ariaLabel(),
          class: 'tiptap-editable'
        }
      }
    });

    this.editor.on('selectionUpdate', () => {
      this.linkActive.set(this.editor.isActive('link'));
    });

    // Editor → model: only write when the editor's HTML diverges from the
    // current value to avoid an infinite update loop with the effect below.
    this.editor.on('update', () => {
      const html = this.editor.getHTML();
      if (html !== this.value()) {
        this.value.set(html);
      }
    });

    // Model → editor: external value changes propagate into the editor.
    // Guard against re-entry by checking against the editor's current HTML.
    effect(() => {
      const incoming = this.value();
      if (incoming !== this.editor.getHTML()) {
        this.editor.commands.setContent(incoming, { emitUpdate: false });
      }
    });
  }

  ngOnDestroy() {
    this.editor.destroy();
  }

  protected toggleColorPicker() {
    this.activePopover.update((v) => (v === 'color' ? null : 'color'));
  }

  protected applyColor(value: string | null) {
    const chain = this.editor.chain().focus();
    if (value === null) {
      chain.unsetColor().run();
    } else {
      chain.setColor(value).run();
    }
    this.activePopover.set(null);
  }

  protected openLinkEditor() {
    if (this.linkEditorOpen()) {
      this.activePopover.set(null);
      return;
    }
    const previousUrl = this.editor.getAttributes('link')['href'] as
      | string
      | undefined;
    this.linkUrl.set(previousUrl ?? '');
    this.activePopover.set('link');
  }

  protected applyLink() {
    const raw = this.linkUrl().trim();
    if (raw === '') {
      this.removeLink();
      return;
    }
    // Tiptap's setLink silently rejects URLs without a recognized protocol.
    // Prepend https:// for bare hosts so the common case works.
    const url = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    const ok = this.editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();
    if (ok) {
      this.activePopover.set(null);
    }
  }

  protected removeLink() {
    this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
    this.activePopover.set(null);
  }

  protected cancelLinkEditor() {
    this.activePopover.set(null);
  }
}
