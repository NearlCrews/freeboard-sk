import type { OnInit } from '@angular/core';
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
import { RemarkModule } from 'ngx-remark';
import { AddTargetPipe } from './add-target.pipe';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbCardActionsComponent,
  FbDialogActionsDirective,
  FbDialogContentDirective,
  FbIconComponent,
  FbInputComponent,
  FbTextareaComponent,
  FbRichTextEditorComponent,
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
    FbIconComponent,
    FbInputComponent,
    FbTextareaComponent,
    FbRichTextEditorComponent,
    FbSelectComponent,
    FbSelectOptionTemplateDirective,
    FbSelectTriggerDirective,
    FbSwitchComponent,
    FbToolbarComponent,
    FbTooltipDirective,
    CoordsPipe,
    AddTargetPipe,
    RemarkModule
  ],
  templateUrl: `note-dialog.html`,
  styleUrl: './note-dialog.scss'
})
export class NoteDialog implements OnInit {
  protected icon: AppIconDef = {};
  protected poiIcons: { id: string; name: string }[] = [];
  protected poiIconOptions: readonly FbSelectOption<string>[] = [];
  protected data = inject<DialogData>(DIALOG_DATA);
  protected app = inject(AppFacade);
  protected dialogRef = inject(DialogRef<unknown, NoteDialog>);

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
