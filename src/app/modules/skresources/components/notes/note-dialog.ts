import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import { CoordsPipe } from 'src/app/lib/pipes';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import type { AngularEditorConfig } from '@kolkov/angular-editor';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { RemarkModule } from 'ngx-remark';
import { AddTargetPipe } from './safe.pipe';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbCardActionsComponent,
  FbIconComponent,
  FbInputComponent,
  FbTextareaComponent,
  FbSelectComponent,
  FbSelectOptionTemplateDirective,
  FbSelectTriggerDirective,
  FbSwitchComponent,
  FbToolbarComponent,
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
  // ViewEncapsulation.None so the angular-editor stylesheet (imported
  // via styleUrls below) reaches the editor's deeply-nested children.
  // The editor's class names are specific enough (`.angular-editor*`)
  // that global scope is fine, and the styles only insert when this
  // dialog actually mounts.
  encapsulation: ViewEncapsulation.None,
  imports: [
    FormsModule,
    FormField,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    FbButtonComponent,
    FbCardComponent,
    FbCardContentComponent,
    FbCardActionsComponent,
    FbIconComponent,
    FbInputComponent,
    FbTextareaComponent,
    FbSelectComponent,
    FbSelectOptionTemplateDirective,
    FbSelectTriggerDirective,
    FbSwitchComponent,
    FbToolbarComponent,
    AngularEditorModule,
    CoordsPipe,
    AddTargetPipe,
    RemarkModule
  ],
  templateUrl: `note-dialog.html`,
  styleUrls: [
    '../../../../../../node_modules/@kolkov/angular-editor/themes/default.scss'
  ],
  styles: [
    // Override the global `b { font-weight: 500 }` rule from
    // src/styles.scss so bold actually looks bold inside the editor.
    `
      .angular-editor-textarea b {
        font-weight: bold;
      }
    `
  ]
})
export class NoteDialog implements OnInit {
  private editorHiddenButtons = [
    [
      //'undo',
      //'redo',
      //'bold',
      //'italic',
      //'underline',
      'strikeThrough',
      'subscript',
      'superscript',
      'justifyLeft',
      'justifyCenter',
      'justifyRight',
      'justifyFull',
      'indent',
      'outdent',
      'insertUnorderedList',
      'insertOrderedList',
      'heading',
      'fontName'
    ],
    [
      'fontSize',
      //'textColor',
      'backgroundColor',
      'customClasses',
      'link',
      'unlink',
      'insertImage',
      'insertVideo',
      'insertHorizontalRule',
      'removeFormat',
      'toggleEditorMode'
    ]
  ];

  public editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: false,
    height: 'auto',
    minHeight: '150',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    translate: 'no',
    enableToolbar: true,
    showToolbar: true,
    placeholder: 'Enter text here...',
    defaultParagraphSeparator: '',
    defaultFontName: '',
    defaultFontSize: '',
    fonts: [{ class: 'roboto', name: 'Default' }],
    customClasses: [],
    sanitize: true,
    toolbarPosition: 'top',
    toolbarHiddenButtons: this.editorHiddenButtons
  };

  protected icon: AppIconDef = {};
  protected poiIcons: { id: string; name: string }[] = [];
  protected poiIconOptions: readonly FbSelectOption<string>[] = [];
  protected data = inject<DialogData>(MAT_DIALOG_DATA);
  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<NoteDialog>);

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
