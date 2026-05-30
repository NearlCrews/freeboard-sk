import type { OnDestroy, OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import { CoordsPipe } from 'src/app/lib/pipes';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { Link } from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { RemarkModule } from 'ngx-remark';
import { AddTargetPipe } from './add-target.pipe';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbCardActionsComponent,
  FbDialogActionsDirective,
  FbDialogContentDirective,
  FbDividerComponent,
  FbIconComponent,
  FbInputComponent,
  FbTextareaComponent,
  FbSelectComponent,
  FbSelectOptionTemplateDirective,
  FbSelectTriggerDirective,
  FbSwitchComponent,
  FbToolbarComponent,
  FbTooltipDirective,
  type FbSelectOption
} from 'src/app/design-system/primitives';

import { AppFacade } from 'src/app/app.facade';
import type { AppIconDef } from 'src/app/modules/icons';
import { getResourceIcon, listPoiIds } from 'src/app/modules/icons';
import type { SKNote } from '../../resource-classes';
import type { SKPosition } from 'src/app/types';

interface ColorSwatch {
  readonly label: string;
  readonly value: string | null;
}

const NOTE_COLOR_PALETTE: readonly ColorSwatch[] = [
  { label: 'Default', value: null },
  { label: 'Danger (red)', value: 'oklch(60% 0.2 25)' },
  { label: 'Caution (amber)', value: 'oklch(75% 0.18 70)' },
  { label: 'Safe (green)', value: 'oklch(60% 0.15 145)' },
  { label: 'Info (blue)', value: 'oklch(55% 0.15 250)' }
];

// StarterKit 3.x bundles Underline and Link with defaults. We register them
// separately to override defaults (no openOnClick), so disable the bundled
// versions to avoid duplicate-extension warnings and double event handlers.
const NOTE_EDITOR_EXTENSIONS = [
  StarterKit.configure({ underline: false, link: false }),
  Underline,
  TextStyle,
  Color,
  Link.configure({ openOnClick: false, autolink: true })
];

interface DialogData {
  title: string;
  note: SKNote;
  editable: boolean;
  addMode: boolean;
  position?: SKPosition;
}

@Component({
  selector: 'ap-notedialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    FormField,
    FbButtonComponent,
    FbCardComponent,
    FbCardContentComponent,
    FbCardActionsComponent,
    FbDialogActionsDirective,
    FbDialogContentDirective,
    FbDividerComponent,
    FbIconComponent,
    FbInputComponent,
    FbTextareaComponent,
    FbSelectComponent,
    FbSelectOptionTemplateDirective,
    FbSelectTriggerDirective,
    FbSwitchComponent,
    FbToolbarComponent,
    FbTooltipDirective,
    TiptapEditorDirective,
    CoordsPipe,
    AddTargetPipe,
    RemarkModule
  ],
  templateUrl: `note-dialog.html`,
  styleUrl: './note-dialog.scss'
})
export class NoteDialog implements OnInit, OnDestroy {
  protected icon: AppIconDef = {};
  protected poiIcons: { id: string; name: string }[] = [];
  protected poiIconOptions: readonly FbSelectOption<string>[] = [];
  protected data = inject<DialogData>(DIALOG_DATA);
  protected app = inject(AppFacade);
  protected dialogRef = inject(DialogRef<unknown, NoteDialog>);

  // Created only for editable HTML notes; markdown notes use fb-textarea and
  // read-only notes use [innerHTML]. Recreated reactively if the user toggles
  // the Format select mid-edit. Typed with explicit `undefined` (not `?:`) so
  // syncEditorToMimeType can clear it under exactOptionalPropertyTypes.
  protected editor: Editor | undefined;

  protected readonly colorPalette = NOTE_COLOR_PALETTE;

  // At most one popover is open at a time. Hand-rolled mutual exclusion of
  // two booleans scales linearly with each new popover; this discriminator
  // keeps the invariant explicit and constant-cost.
  protected activePopover = signal<'color' | 'link' | null>(null);
  protected colorPickerOpen = computed(() => this.activePopover() === 'color');
  protected linkEditorOpen = computed(() => this.activePopover() === 'link');

  // Mirror of `editor.isActive('link')` so the toolbar's Remove button
  // updates reactively when the caret moves into or out of a link mark.
  protected linkActive = signal(false);
  protected linkUrl = signal('');

  protected noteModel = signal<{ name: string }>({ name: '' });
  protected noteForm = form(this.noteModel, (p) => {
    required(p.name, { message: 'Please enter a title for the note' });
  });
  protected saveDisabled = computed(() => this.noteForm().invalid());

  protected readonly mimeTypeOptions: readonly FbSelectOption[] = [
    { id: 'text/markdown', label: 'Markdown' },
    { id: '', label: 'HTML' }
  ];

  ngOnInit() {
    if (!this.data.note.properties) {
      this.data.note.properties = {};
    }
    if (typeof this.data.note.description === 'undefined') {
      this.data.note.description = '';
    }
    if (this.data.note.properties['readOnly']) {
      this.data.editable = false;
    }
    this.icon = this.cleanIconDef(getResourceIcon('notes', this.data.note));
    this.poiIcons = listPoiIds();
    this.poiIconOptions = this.poiIcons.map((p) => ({
      id: p.id,
      label: p.name
    }));
    this.noteModel.set({ name: this.data.note.name ?? '' });
    this.syncEditorToMimeType();
  }

  protected onMimeTypeChange() {
    this.syncEditorToMimeType();
  }

  private syncEditorToMimeType() {
    const wantsEditor =
      this.data.editable && !this.data.note.mimeType.includes('markdown');
    if (wantsEditor && !this.editor) {
      const editor = new Editor({
        extensions: NOTE_EDITOR_EXTENSIONS,
        content: this.data.note.description ?? '',
        editorProps: {
          attributes: {
            'aria-label': 'Note description',
            class: 'tiptap-editable'
          }
        }
      });
      editor.on('selectionUpdate', () => {
        this.linkActive.set(editor.isActive('link'));
      });
      this.editor = editor;
    } else if (!wantsEditor && this.editor) {
      this.editor.destroy();
      this.editor = undefined;
      this.activePopover.set(null);
      this.linkActive.set(false);
    }
  }

  ngOnDestroy() {
    this.editor?.destroy();
  }

  cleanIconDef(icon: AppIconDef) {
    icon.svgIcon = icon.svgIcon ?? '';
    return icon;
  }

  asString(v: string | number): string {
    return String(v);
  }

  onIconSelected(e: string) {
    if (e.startsWith('sk-')) {
      this.data.note.properties['skIcon'] = e.slice(3);
    } else {
      delete this.data.note.properties['skIcon'];
    }
    this.icon = this.cleanIconDef(getResourceIcon('notes', this.data.note));
  }

  protected toggleColorPicker() {
    if (!this.editor) return;
    this.activePopover.update((v) => (v === 'color' ? null : 'color'));
  }

  protected applyColor(value: string | null) {
    if (!this.editor) return;
    const chain = this.editor.chain().focus();
    if (value === null) {
      chain.unsetColor().run();
    } else {
      chain.setColor(value).run();
    }
    this.activePopover.set(null);
  }

  protected openLinkEditor() {
    if (!this.editor) return;
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
    if (!this.editor) return;
    const raw = this.linkUrl().trim();
    if (raw === '') {
      this.removeLink();
      return;
    }
    // Tiptap's setLink silently rejects URLs without a recognized protocol
    // (http, https, ftp, mailto, tel, etc.). Prepend https:// when the user
    // entered a bare host so the common case works without a feedback gap.
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
    if (!this.editor) return;
    this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
    this.activePopover.set(null);
  }

  protected cancelLinkEditor() {
    this.activePopover.set(null);
  }

  onSave() {
    this.data.note.name = this.noteModel().name;
    this.dialogRef.close({
      result: true,
      data: this.data.note,
      action: 'save'
    });
  }

  openNoteUrl() {
    window.open(this.data.note.url, '_notes');
  }
}
