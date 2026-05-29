import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  Inject,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import {
  FbButtonComponent,
  FbDialogContentDirective,
  FbIconComponent,
  FbSelectComponent,
  FbToolbarComponent,
  FbTooltipDirective,
  type FbSelectOption
} from 'src/app/design-system/primitives';

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
    FbButtonComponent,
    FbDialogContentDirective,
    FbIconComponent,
    FbSelectComponent,
    FbToolbarComponent,
    FbTooltipDirective,
    FileInputComponent
  ]
})
export class ResourceImportDialog implements OnInit {
  public resPaths = signal<readonly string[]>([]);
  public targetPath: string | null = null;
  public source: {
    type: string | null;
    name: string | null;
    data: string | null;
  } = { type: null, name: null, data: null };

  public display = {
    notValid: false
  };

  public pathOptions = computed<readonly FbSelectOption[]>(() =>
    this.resPaths().map((p) => ({ id: p, label: p }))
  );

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
        (r: Record<string, unknown>) => {
          this.targetPath = null;
          this.resPaths.set(
            Object.keys(r).filter((i) => {
              return ![
                'routes',
                'waypoints',
                'notes',
                'regions',
                'charts',
                'tracks'
              ].includes(i);
            })
          );
        },
        () => {
          this.resPaths.set([]);
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
