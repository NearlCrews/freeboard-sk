import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
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
import type { FBNote } from 'src/app/types';

interface DialogData {
  notes: FBNote[];
  relatedBy: string;
  readOnly: boolean;
}

@Component({
  selector: 'ap-relatednotesdialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
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
    if (!name) {
      return 'var(--notes-text-muted)';
    }
    const palette = [
      '#b66428',
      '#5b7b8b',
      '#8b5e5e',
      '#5e8b6e',
      '#8e7948',
      '#6e5b8b',
      '#8b6e48',
      '#487b8b'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return palette[Math.abs(hash) % palette.length] ?? palette[0]!;
  }

  snippet(note: { description?: string; mimeType?: string }): string {
    const body = note?.description;
    if (!body) {
      return '';
    }
    let text = body.replace(/<[^>]+>/g, ' ');
    text = text
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_`~>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 180 ? text.slice(0, 180).trim() + '...' : text;
  }
}
