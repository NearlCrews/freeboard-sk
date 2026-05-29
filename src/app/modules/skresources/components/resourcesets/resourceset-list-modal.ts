/** Resource Dialog Components **
 ********************************/

import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  signal
} from '@angular/core';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbCheckboxComponent,
  FbIconComponent,
  FbProgressBarComponent,
  FbToolbarComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { AppFacade } from 'src/app/app.facade';
import { FBCustomResourceService } from '../../custom-resources-service';
import type { FBResourceSet, FBResourceSets } from 'src/app/types';

/********* ResourceSetModal **********
 * Fetches ResouorceSets from server for selection
	data: {
        path: "<string>" resource path
    }
***********************************/
@Component({
  selector: 'ap-resourceset-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbCardComponent,
    FbCardContentComponent,
    FbCheckboxComponent,
    FbIconComponent,
    FbProgressBarComponent,
    FbToolbarComponent,
    FbTooltipDirective
  ],
  template: `
    <div class="_ap-resource-set">
      <fb-toolbar class="bg-transparent">
        <span fbToolbarLeading>
          <fb-button
            variant="ghost"
            ariaLabel="Clear selections"
            [disabled]="
              (app.config.selections.resourceSets[data.path]?.length ?? 0) === 0
            "
            fbTooltip="Clear selections"
            fbTooltipPosition="below"
            (pressed)="clearSelections()"
          >
            <fb-icon name="clear_all" ariaLabel=""></fb-icon>
          </fb-button>

          <fb-button
            variant="ghost"
            ariaLabel="Refresh list entries"
            fbTooltip="Refresh list entries"
            fbTooltipPosition="below"
            (pressed)="getItems(true)"
          >
            <fb-icon name="refresh" ariaLabel=""></fb-icon>
          </fb-button>
        </span>
        <span fbToolbarTitle>
          {{ title }}
        </span>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            ariaLabel="Close"
            (pressed)="closeModal()"
            fbTooltip="Close"
            fbTooltipPosition="below"
          >
            <fb-icon name="keyboard_arrow_down" ariaLabel=""></fb-icon>
          </fb-button>
        </span>
      </fb-toolbar>
      @if (app.sIsFetching()) {
        <fb-progress-bar indeterminate></fb-progress-bar>
      } @else {
        @for (res of resList(); track res[0]; let idx = $index) {
          <fb-card>
            <fb-card-content>
              <div style="display:flex;flex-wrap:no-wrap;">
                <div style="width:45px;">
                  <fb-checkbox
                    [checked]="res[2]"
                    (checkedChange)="handleCheck($event, res[0], idx)"
                  ></fb-checkbox>
                </div>
                <div style="flex:1 1 auto;">
                  <div class="key-label">
                    {{ res[1].name }}
                  </div>
                  <div class="key-desc">
                    {{ res[1].description }}
                  </div>
                </div>
                <div style="width:45px;"></div>
              </div>
            </fb-card-content>
          </fb-card>
        }
      }
    </div>
  `,
  styles: [
    `
      ._ap-resource-set {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-resource-set .key-label {
        font-weight: 500;
      }
      ._ap-resource-set .key-desc {
        font-style: italic;
      }
    `
  ]
})
export class ResourceSetModal implements OnInit {
  protected resList = signal<FBResourceSets>([]);
  protected title = 'Resources: ';

  constructor(
    public app: AppFacade,
    private skresOther: FBCustomResourceService,
    protected modalRef: MatBottomSheetRef<ResourceSetModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      path: string;
    }
  ) {}

  ngOnInit() {
    if (this.data.path !== 'undefined') {
      this.title += this.data.path;
    }
    this.getItems();
  }

  protected closeModal() {
    this.modalRef.dismiss();
  }

  protected async getItems(silent?: boolean) {
    try {
      if (!silent) {
        this.app.sIsFetching.set(true);
      }
      const list = await this.skresOther.customListFromServer<FBResourceSet>(
        this.data.path,
        'ResourceSet'
      );
      this.app.sIsFetching.set(false);
      this.resList.set(list);
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.resList.set([]);
    }
  }

  protected handleCheck(checked: boolean, id: string, idx: number) {
    this.resList.update((current) => {
      const entry = current[idx];
      if (entry) {
        entry[2] = checked;
      }
      const selections =
        (this.app.config.selections.resourceSets[this.data.path] as
          | string[]
          | undefined) ?? [];
      if (checked) {
        selections.push(id);
      } else {
        const i = selections.indexOf(id);
        if (i !== -1) {
          selections.splice(i, 1);
        }
      }
      this.app.config.selections.resourceSets[this.data.path] = selections;
      return current.slice();
    });
    this.app.saveConfig();
    this.skresOther.refreshResourceSetsInBounds(this.data.path);
  }

  protected clearSelections() {
    this.resList.update((current) => {
      current.forEach((i) => (i[2] = false));
      return current;
    });
    this.app.config.selections.resourceSets[this.data.path] = [];
    this.app.saveConfig();
    this.skresOther.refreshResourceSetsInBounds(this.data.path);
  }
}
