import {
  Component,
  ChangeDetectionStrategy,
  signal,
  effect,
  output,
  inject,
  OnInit
} from '@angular/core';

import { ScrollingModule } from '@angular/cdk/scrolling';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardHeaderComponent,
  FbCardContentComponent,
  FbCardActionsComponent,
  FbCheckboxComponent,
  FbIconComponent,
  FbProgressBarComponent,
  FbSearchInputComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';

import { AppFacade } from 'src/app/app.facade';
import { HttpErrorResponse } from '@angular/common/http';
import { SKResourceService, SKResourceType } from 'src/app/modules/skresources';
import { FBTrack, FBTracks, Position } from 'src/app/types';
import { SKWorkerService } from 'src/app/modules';
import { ResourceListBase } from '../resource-list-baseclass';
import { RemarkModule } from 'ngx-remark';

@Component({
  selector: 'track-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tracklist.html',
  styleUrls: ['../resourcelist.css'],
  imports: [
    FbButtonComponent,
    ScrollingModule,
    RemarkModule,
    FbCardComponent,
    FbCardHeaderComponent,
    FbCardContentComponent,
    FbCardActionsComponent,
    FbCheckboxComponent,
    FbIconComponent,
    FbProgressBarComponent,
    FbSearchInputComponent,
    FbTooltipDirective
  ]
})
export class TrackListComponent extends ResourceListBase implements OnInit {
  closed = output<void>();
  center = output<Position>();

  protected override fullList: FBTracks = [];
  protected override filteredList = signal<FBTracks>([]);

  protected app = inject(AppFacade);
  private worker = inject(SKWorkerService);

  constructor(protected override skres: SKResourceService) {
    super('tracks', skres);
    // resources delta handler
    effect(() => {
      if (this.worker.resourceUpdate().path.includes('resources.tracks')) {
        this.initItems(true);
      }
    });
  }

  ngOnInit() {
    this.initItems();
  }

  /**
   * @description Close track list
   */
  protected close() {
    this.closed.emit();
  }

  /** @description Initialise the track list.
   * @param silent Do not show progress bar when true.
   */
  protected async initItems(silent?: boolean) {
    if (this.app.sIsFetching()) {
      this.app.debug('** isFetching() ... exit.');
      return;
    }
    this.app.sIsFetching.set(!(silent ?? false));
    try {
      this.fullList = await this.skres.listFromServer<FBTrack>(
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
      this.skres.trackAddFromServer();
    } else {
      this.skres.trackRemove();
    }
  }

  /**
   * @description Handle track entry check / uncheck
   * @param checked Value indicating entry is checked / unchecked
   * @param id Track identifier
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
        this.skres.trackAdd([entry]);
      } else {
        this.skres.trackRemove([entry[0]]);
      }
    }
  }

  /**
   * @description Show track properties
   * @param id track identifier
   */
  protected itemProperties(id: string) {
    this.skres.editTrackInfo(id);
  }

  /**
   * @description Show delete track dialog
   * @param id track identifier
   */
  protected itemDelete(id: string) {
    this.skres.deleteTrack(id);
  }

  /**
   * @description Center the map at the supplied position
   * @param position Position at which to center the map
   */
  protected emitCenter(position: Position) {
    this.center.emit(position);
  }
}
