import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RemarkModule } from 'ngx-remark';

import { AppFacade } from 'src/app/app.facade';
import { textSnippet } from 'src/app/lib/text-snippet';
import type { FBNote } from 'src/app/types';
import { groupColor as groupColorOf } from './note-helpers';

interface DialogData {
  notes: FBNote[];
  relatedBy: string;
  readOnly: boolean;
}

@Component({
  selector: 'ap-relatednotesdialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    RemarkModule
  ],
  templateUrl: `relatednotes-dialog.html`,
  styleUrls: ['notes.scss', 'relatednotes-dialog.scss']
})
export class RelatedNotesDialog implements OnInit {
  protected relatedBy = '';

  protected data = inject<DialogData>(MAT_DIALOG_DATA);
  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<RelatedNotesDialog>);

  ngOnInit() {
    const r = this.data.relatedBy;
    if (!r) {
      this.relatedBy = '';
      return;
    }
    const first = r.charAt(0).toUpperCase();
    this.relatedBy = first + r.slice(1);
  }

  openNoteUrl(url: string) {
    window.open(url, '_notes');
  }

  addNote() {
    this.dialogRef.close({ result: true, data: 'add' });
  }

  editNote(noteId: string) {
    this.dialogRef.close({ result: true, data: 'edit', id: noteId });
  }

  deleteNote(noteId: string) {
    this.dialogRef.close({ result: true, data: 'delete', id: noteId });
  }

  groupColor(name: string | undefined): string {
    return groupColorOf(name);
  }

  snippet(note: { description?: string; mimeType?: string }): string {
    return textSnippet(note?.description, 180);
  }
}
