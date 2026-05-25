import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Inject,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';

import { SignalKClient } from 'src/lib/signalk-client';
import { FileInputComponent } from 'src/app/lib/components/file-input.component';
import { AppFacade } from 'src/app/app.facade';

//** Resources upload dialog **
@Component({
  selector: 'resource-upload-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-upload-dialog.html',
  styleUrls: ['./resource-upload-dialog.css'],
  imports: [
    FormsModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatDialogModule,
    FileInputComponent
  ]
})
export class ResourceImportDialog implements OnInit {
  public resPaths: string[] = [];
  public targetPath: string = null;
  public source = { type: null, name: null, data: null };

  public display = {
    notValid: false
  };

  private destroyRef = inject(DestroyRef);

  constructor(
    public app: AppFacade,
    public skclient: SignalKClient,
    public dialogRef: MatDialogRef<ResourceImportDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_DIALOG_DATA) public data: Record<string, any>
  ) {}

  ngOnInit() {
    this.skclient.api
      .get(this.app.skApiVersion, '/resources')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (r) => {
          this.resPaths = [];
          this.targetPath = null;
          this.resPaths = Object.keys(r).filter((i) => {
            return ![
              'routes',
              'waypoints',
              'notes',
              'regions',
              'charts',
              'tracks'
            ].includes(i);
          });
        },
        () => {
          this.resPaths = [];
          this.targetPath = null;
        }
      );
  }

  // ** send data for load to server **
  load() {
    this.dialogRef.close({ path: this.targetPath, data: this.source.data });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseFile(e: any) {
    this.source = e;
    this.source.type = 'Unknown';
    try {
      const jdata = JSON.parse(e.data);
      this.source.type = jdata.type ? jdata.type : this.source.type;
    } catch (error) {
      console.log(`Error parsing resource file!`);
    }
  }
}
