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
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import {
  FbButtonComponent,
  FbDialogActionsDirective,
  FbDialogContentDirective,
  FbIconComponent,
  FbInputComponent,
  FbTextareaComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

import type { SKRoute } from '../../resource-classes';

interface DialogData {
  route: SKRoute;
}

@Component({
  selector: 'ap-routedialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    FormField,
    FbButtonComponent,
    FbDialogActionsDirective,
    FbDialogContentDirective,
    FbIconComponent,
    FbInputComponent,
    FbTextareaComponent,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-route">
      <fb-toolbar class="bg-transparent">
        <div fbToolbarLeading>
          <fb-icon class="icon-route" svgName="route" ariaLabel=""></fb-icon>
        </div>
        <span fbToolbarTitle>Route Details</span>
        <div fbToolbarActions class="w-50 text-right">
          <fb-button
            variant="ghost"
            size="sm"
            ariaLabel="Close"
            (pressed)="handleClose(false)"
          >
            <fb-icon name="close" ariaLabel=""></fb-icon>
          </fb-button>
        </div>
      </fb-toolbar>

      <div fbDialogContent>
        <div class="flex">
          <div class="flex-auto">
            <div>
              <label for="route-name" class="block font-semibold"> Name </label>
              <fb-input type="text" [formField]="rForm.name"></fb-input>
              @if (
                rForm.name().invalid() &&
                (rForm.name().dirty() || rForm.name().touched())
              ) {
                <div class="error-xs">Please enter a name.</div>
              }
            </div>
            <div>
              <label for="route-description" class="block font-semibold">
                Description
              </label>
              <fb-textarea
                name="route-description"
                [disabled]="readOnly"
                [(value)]="description"
              ></fb-textarea>
            </div>
          </div>
        </div>
      </div>
      @if (!readOnly) {
        <div fbDialogActions align="end">
          <fb-button
            variant="primary"
            [disabled]="saveDisabled()"
            (pressed)="handleClose(true)"
          >
            SAVE
          </fb-button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      ._ap-route {
        min-width: 300px;
      }
    `
  ]
})
export class RouteDialog implements OnInit {
  protected description = '';
  protected readOnly = false;

  protected rModel = signal<{ name: string }>({ name: '' });
  protected rForm = form(this.rModel, (p) => {
    required(p.name, { message: 'Please enter a name.' });
  });
  protected saveDisabled = computed(() => this.rForm().invalid());

  private dialogRef = inject(MatDialogRef<RouteDialog>);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);

  ngOnInit() {
    this.rModel.set({ name: this.data.route.name ?? '' });
    this.description = this.data.route.description ?? '';
    this.readOnly =
      (this.data.route.feature.properties?.['readOnly'] as boolean) ?? false;
  }

  handleClose(save: boolean) {
    if (save) {
      this.data.route.name = this.rModel().name;
      this.data.route.description = this.description;
    }
    this.dialogRef.close({ save: save, route: this.data.route });
  }
}
