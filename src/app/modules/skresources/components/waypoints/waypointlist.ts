import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  signal,
  effect,
  output,
  inject,
  input,
  OnInit,
  OnChanges
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';

import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatDialog } from '@angular/material/dialog';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardHeaderComponent,
  FbCardContentComponent,
  FbCardActionsComponent,
  FbCheckboxComponent,
  FbIconComponent,
  FbInputComponent,
  FbProgressBarComponent
} from 'src/app/design-system/primitives';

import { AppFacade } from 'src/app/app.facade';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Position,
  FBWaypoints,
  FBWaypoint,
  FBResourceSelect
} from 'src/app/types';
import { SKResourceService, SKResourceType } from '../../resources.service';
import { SKWorkerService } from 'src/app/modules/skstream/skstream.service';
import { ResourceListBase } from '../resource-list-baseclass';
import { SKResourceGroupService } from '../groups/groups.service';
import { SingleSelectListDialog } from 'src/app/lib/components';

@Component({
  selector: 'waypoint-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './waypointlist.html',
  styleUrls: ['../resourcelist.css'],
  imports: [
    CommonModule,
    MatTooltipModule,
    MatIconModule,
    FormsModule,
    ScrollingModule,
    FbButtonComponent,
    FbCardComponent,
    FbCardHeaderComponent,
    FbCardContentComponent,
    FbCardActionsComponent,
    FbCheckboxComponent,
    FbIconComponent,
    FbInputComponent,
    FbProgressBarComponent
  ]
})
export class WaypointListComponent
  extends ResourceListBase
  implements OnInit, OnChanges
{
  activeWaypoint = input<string>();
  editingWaypointId = input<string>();
  select = output<FBResourceSelect>();
  goto = output<FBResourceSelect>();
  deactivate = output<FBResourceSelect>();
  closed = output<void>();
  center = output<Position>();
  notes = output<{ id: string; readOnly: boolean }>();

  protected override fullList: FBWaypoints = [];
  protected override filteredList = signal<FBWaypoints>([]);
  protected disableRefresh = false;

  protected app = inject(AppFacade);
  private worker = inject(SKWorkerService);
  private dialog = inject(MatDialog);
  private skgroups = inject(SKResourceGroupService);
  private destroyRef = inject(DestroyRef);

  constructor(protected override skres: SKResourceService) {
    super('waypoints', skres);
    // resources delta handler
    effect(() => {
      if (this.worker.resourceUpdate().path.includes('resources.waypoints')) {
        this.initItems(true);
      }
    });
  }

  ngOnInit() {
    this.initItems();
  }

  ngOnChanges() {
    this.initItems();
    const editingId = this.editingWaypointId();
    this.disableRefresh = !!editingId && editingId.includes('waypoint');
  }

  /**
   * @description Close waypoint list
   */
  protected close() {
    this.closed.emit();
  }

  /**
   * @description Initialise the waypoint list.
   * @param silent Do not show progress bar when true.
   */
  protected async initItems(silent?: boolean) {
    if (this.app.sIsFetching()) {
      this.app.debug('** isFetching() ... exit.');
      return;
    }
    this.app.sIsFetching.set(!(silent ?? false));
    try {
      this.fullList = await this.skres.listFromServer<FBWaypoint>(
        this.collection as SKResourceType
      );
      this.app.sIsFetching.set(false);
      this.doFilter();
      this.skres.selectionClean(
        this.collection,
        this.fullList.map((i) => i[0])
      );
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.app.parseHttpErrorResponse(err);
      this.fullList = [];
    }
  }

  /**
   * @description Toggle selections on / off
   * @param checked Determines if all checkboxes are checked or unchecked
   */
  protected override toggleAll(checked: boolean) {
    super.toggleAll(checked);
    if (checked) {
      this.skres.waypointAddFromServer();
    } else {
      this.skres.waypointRemove();
    }
  }

  /**
   * @description Handle waypoint entry check / uncheck
   * @param checked Value indicating entry is checked / unchecked
   * @param id Waypoint identifier
   */
  protected itemSelect(checked: boolean, id: string) {
    const idx = this.toggleItem(checked, id);
    // update cache
    if (idx !== -1) {
      const entry = this.filteredList()[idx];
      if (!entry) {
        return;
      }
      if (checked) {
        this.skres.waypointAdd([entry]);
      } else {
        this.skres.waypointRemove([entry[0]]);
      }
    }
  }

  /**
   * @description Show waypoint properties
   * @param id waypoint identifier
   */
  protected itemProperties(id: string) {
    this.select.emit({ id: id });
  }

  /**
   * @description Center the map at the supplied position
   * @param position Position at which to center the map
   */
  protected emitCenter(position: Position) {
    this.center.emit(position);
  }

  /**
   * @description Show delete waypoint dialog
   * @param id waypoint identifier
   */
  protected itemDelete(id: string) {
    this.skres.deleteWaypoint(id);
  }

  /**
   * @description Navigate to waypoint
   * @param id waypoint identifier
   */
  protected itemGoTo(id: string) {
    this.itemSelect(true, id); // ensure active resource is selected
    this.goto.emit({ id: id });
  }

  /**
   * @description Clear waypoint as destination
   */
  protected itemClearActive() {
    this.deactivate.emit({ id: '' });
  }

  /**
   * @description Show related Notes dialog
   * @param wpt waypoint object
   */
  protected itemViewNotes(wpt: FBWaypoint) {
    this.notes.emit({
      id: wpt[0],
      readOnly: (wpt[1].feature?.properties?.['readOnly'] as boolean) ?? false
    });
  }

  /**
   * @description Show select Group dialog
   * @param id waypoint identifier
   */
  protected async itemAddToGroup(id: string) {
    try {
      const groups = await this.skgroups.listFromServer();
      const glist = groups.map((g) => {
        return { id: g[0], name: g[1].name };
      });
      this.dialog
        .open(SingleSelectListDialog, {
          data: {
            title: 'Select Group',
            icon: { name: 'category' },
            items: glist
          }
        })
        .afterClosed()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(async (selGrp) => {
          if (selGrp) {
            try {
              await this.skgroups.addToGroup(selGrp.id, 'waypoint', id);
              this.app.showMessage(`Waypoint added to group.`);
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
