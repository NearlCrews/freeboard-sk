import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RemarkModule } from 'ngx-remark';

import {
  FbAccordionComponent,
  FbButtonComponent,
  FbExpansionPanelComponent,
  FbExpansionPanelDescriptionDirective,
  FbExpansionPanelTitleDirective,
  FbIconComponent,
  FbListItemComponent,
  FbNavListComponent,
  FbTooltipDirective,
  FbDialogService
} from 'src/app/design-system/primitives';
import { FbInfoPanelLayoutComponent } from 'src/app/modules/info-panel/layout/info-panel-layout.component';

import { AppFacade } from 'src/app/app.facade';
import { AppIconDef, getResourceIcon } from 'src/app/modules/icons';
import { SKRegion } from '../../resource-classes';
import { Position, FBNotes } from 'src/app/types';
import { SKResourceService } from '../../resources.service';
import {
  FBResourceGroups,
  SKResourceGroupService
} from '../groups/groups.service';
import { SingleSelectListDialog } from 'src/app/lib/components';

@Component({
  selector: 'region-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbAccordionComponent,
    FbButtonComponent,
    FbExpansionPanelComponent,
    FbExpansionPanelDescriptionDirective,
    FbExpansionPanelTitleDirective,
    FbIconComponent,
    FbInfoPanelLayoutComponent,
    FbListItemComponent,
    FbNavListComponent,
    FbTooltipDirective,
    RemarkModule
  ],
  templateUrl: `region-panel.html`,
  styleUrls: []
})
export class RegionPanel {
  region = input<SKRegion>(new SKRegion());
  id = input<string | undefined>(undefined);
  related = input<string | undefined>(undefined);

  protected _region = linkedSignal(() => this.region());
  protected notes = signal<FBNotes>([]);
  protected groups = signal<FBResourceGroups>([]);

  edit = output<string>();
  delete = output<void>();
  info = output<void>();
  addNote = output<void>();
  showRelated = output<string>();
  showNotes = output<void>();
  panTo = output<{
    center: Position;
    zoomLevel: number | null;
  }>();

  protected icon: AppIconDef | undefined;
  protected app = inject(AppFacade);
  private skres = inject(SKResourceService);
  protected skgroups = inject(SKResourceGroupService);
  private dialog = inject(FbDialogService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      this.region();
      this.init(this.region());
    });

    effect(() => {
      const related = this.related();
      if (!related) {
        return;
      }
      if (related.includes('groups')) {
        this.getRelatedGroups();
      } else if (related.includes('notes')) {
        this.getRelatedNotes();
      }
    });
  }

  protected init(n: SKRegion) {
    if (!n) {
      return;
    }
    n.description = n.description ?? '';
    this._region.set(n);
    this.icon = getResourceIcon('regions', this._region());
    this.getRelatedNotes();
    this.getRelatedGroups();
  }

  protected async getRelatedNotes() {
    const id = this.id();
    if (!id) {
      return;
    }
    const n = await this.skres.getRelatedNotes('regions', id);
    this.notes.set(n);
  }

  protected async getRelatedGroups() {
    const id = this.id();
    if (!id) {
      return;
    }
    const g = await this.skgroups.with('regions', id);
    this.groups.set(g);
  }

  protected onEdit() {
    const id = this.id();
    if (id) {
      this.edit.emit(id);
    }
  }

  protected onDelete() {
    this.delete.emit();
  }

  protected onInfo() {
    this.info.emit();
  }

  protected onAddNote() {
    this.addNote.emit();
  }

  protected onRelated() {
    const id = this.id();
    if (id) {
      this.showRelated.emit(id);
    }
  }

  protected onNotes() {
    this.showNotes.emit();
  }

  protected onPanTo() {
    const zoomTo =
      this.app.config.map.zoomLevel < this.app.config.resources.notes.minZoom
        ? this.app.config.resources.notes.minZoom
        : null;

    const geometry = this._region().feature.geometry;
    let position: Position | undefined;
    if (geometry.type === 'MultiPolygon') {
      position = geometry.coordinates[0]?.[0]?.[0];
    } else {
      position = geometry.coordinates[0]?.[0];
    }
    if (!position) {
      return;
    }
    this.panTo.emit({
      center: position,
      zoomLevel: zoomTo
    });
  }

  protected showNote(id: string) {
    this.skres.showNoteDetails(id);
  }

  /**
   * @description Show select Group dialog
   * @param id region identifier
   */
  protected async addToGroup() {
    const regionId = this.id();
    if (!regionId) {
      return;
    }
    try {
      const groups = await this.skgroups.listFromServer();
      const glist = groups.map((g) => {
        return { id: g[0], name: g[1].name };
      });
      if (glist.length) {
        this.app
          .showConfirm(
            'There are currently no groups defined.\nYou will need to first create a group and then add the resource.\n\nDo you want to create a new group?',
            'Group'
          )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((r) => {
            if (r) {
              this.skgroups.editGroupInfo();
            }
          });
        return;
      }
      this.dialog
        .open(SingleSelectListDialog, {
          data: {
            title: 'Select Group',
            icon: { name: 'category', class: 'icon-accent' },
            items: glist
          }
        })
        .closed.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(async (res) => {
          const selGrp = res as { id: string } | undefined;
          if (selGrp) {
            try {
              await this.skgroups.addToGroup(selGrp.id, 'region', regionId);
              this.app.showMessage(`Region added to group.`);
            } catch (err) {
              this.app.parseHttpErrorResponse(err);
            }
          }
        });
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
    }
  }
}
