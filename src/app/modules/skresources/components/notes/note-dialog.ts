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
import { Link } from '@tiptap/extension-link';
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

  // Created only for HTML notes; markdown notes use fb-textarea instead.
  protected editor?: Editor;

  protected linkEditorOpen = signal(false);
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

    if (!this.data.note.mimeType.includes('markdown')) {
      this.editor = new Editor({
        extensions: [
          StarterKit,
          Underline,
          Link.configure({ openOnClick: false, autolink: true })
        ],
        content: this.data.note.description ?? '',
        editorProps: {
          attributes: {
            'aria-label': 'Note description',
            class: 'tiptap-editable'
          }
        }
      });
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

  protected openLinkEditor() {
    if (!this.editor) return;
    if (this.linkEditorOpen()) {
      this.linkEditorOpen.set(false);
      return;
    }
    const previousUrl = this.editor.getAttributes('link')['href'] as
      | string
      | undefined;
    this.linkUrl.set(previousUrl ?? '');
    this.linkEditorOpen.set(true);
  }

  protected applyLink() {
    if (!this.editor) return;
    const url = this.linkUrl().trim();
    if (url === '') {
      this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      this.editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
    this.linkEditorOpen.set(false);
  }

  protected removeLink() {
    if (!this.editor) return;
    this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
    this.linkEditorOpen.set(false);
  }

  protected cancelLinkEditor() {
    this.linkEditorOpen.set(false);
  }

  protected isLinkActive(): boolean {
    return this.editor?.isActive('link') ?? false;
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
