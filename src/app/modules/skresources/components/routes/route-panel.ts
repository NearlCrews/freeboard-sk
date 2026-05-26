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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog } from '@angular/material/dialog';

import { RemarkModule } from 'ngx-remark';

import { AppFacade } from 'src/app/app.facade';
import { AlarmStore } from 'src/app/stores';
import { AppIconDef, getResourceIcon } from 'src/app/modules/icons';
import { SKRoute } from '../../resource-classes';
import { Position } from 'geojson';
import { SKResourceService } from '../../resources.service';
import { FBNotes } from 'src/app/types';
import {
  FBResourceGroups,
  SKResourceGroupService
} from '../groups/groups.service';
import { SingleSelectListDialog } from 'src/app/lib/components';
import { CourseService } from 'src/app/modules/course';
import { GeoUtils } from 'src/app/lib/geoutils';
import { MatStepperModule } from '@angular/material/stepper';
import { Convert } from 'src/app/lib/convert';
import { ActiveResourcePropertiesModal } from '../active-resource-dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'route-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDivider,
    MatListModule,
    MatExpansionModule,
    MatStepperModule,
    RemarkModule
  ],
  templateUrl: `route-panel.html`,
  styleUrls: []
})
export class RoutePanel {
  route = input<SKRoute>(new SKRoute());
  id = input<string | undefined>(undefined);
  related = input<string | undefined>(undefined);

  activate = output<string>();
  edit = output<string>();
  panTo = output<{
    center: Position;
    zoomLevel: number | null;
  }>();

  protected _route = linkedSignal(() => this.route());
  protected notes = signal<FBNotes>([]);
  protected groups = signal<FBResourceGroups>([]);
  protected points = signal<
    {
      index: number;
      name: string;
      description: string;
      bearing: string;
      distance: string;
    }[]
  >([]);

  private routeReversed = false;

  protected icon: AppIconDef | undefined;
  protected app = inject(AppFacade);
  // Phase 3 Batch 3: direct AlarmStore injection for showMessage and
  // parseHttpErrorResponse.
  private alarm = inject(AlarmStore);
  private skres = inject(SKResourceService);
  private course = inject(CourseService);
  protected skgroups = inject(SKResourceGroupService);
  private dialog = inject(MatDialog);
  private bottomSheet = inject(MatBottomSheet);
  private destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      this.route();
      this.init(this.route());
    });

    effect(() => {
      if (this.related()?.includes('groups')) {
        this.getRelatedGroups();
      } else if (this.related()?.includes('notes')) {
        this.getRelatedNotes();
      }
    });

    effect(() => {
      this.course.courseData();
      if (this.routeReversed !== this.app.data.activeRouteReversed) {
        this.routeReversed = this.app.data.activeRouteReversed;
        this.parsePoints();
      }
    });
  }

  protected init(n: SKRoute) {
    if (!n) {
      return;
    }
    n.description = n.description ?? '';
    this._route.set(n);
    this.icon = getResourceIcon('routes', this._route());
    this.getRelatedNotes();
    this.getRelatedGroups();
    this.parsePoints();
  }

  protected async getRelatedNotes() {
    const id = this.id();
    if (!id) {
      return;
    }
    const n = await this.skres.getRelatedNotes('routes', id);
    this.notes.set(n);
  }

  protected async getRelatedGroups() {
    const id = this.id();
    if (!id) {
      return;
    }
    const g = await this.skgroups.with('routes', id);
    this.groups.set(g);
  }

  protected parsePoints() {
    if (this._route().feature && this._route().feature.geometry.coordinates) {
      const legs = this.getLegInfo();
      const meta = this.getPointsMeta();
      this.points.update(() => {
        const merged: {
          index: number;
          name: string;
          description: string;
          bearing: string;
          distance: string;
        }[] = [];
        for (let i = 0; i < legs.length; ++i) {
          const leg = legs[i];
          const m = meta[i];
          if (!leg || !m) continue;
          merged.push({ ...leg, ...m });
        }
        return this.app.data.activeRouteReversed ? merged.reverse() : merged;
      });
    }
  }

  /** Get bearing and distance for each route leg */
  private getLegInfo() {
    const pos = this.app.data.vessels.self.position ?? undefined;
    return GeoUtils.routeLegs(
      this._route().feature.geometry.coordinates,
      pos
    ).map((l) => {
      return {
        bearing: this.app.formatValueForDisplay(l.bearing, 'deg'),
        distance: this.app.formatValueForDisplay(l.distance, 'm')
      };
    });
  }

  /** get route point metatdata */
  private getPointsMeta(): {
    index: number;
    name: string;
    description: string;
  }[] {
    const properties = this._route().feature.properties;
    const coordinatesMeta = properties?.['coordinatesMeta'] as
      | { name?: string; description?: string; href?: string }[]
      | undefined;
    if (Array.isArray(coordinatesMeta)) {
      const pointsMeta = coordinatesMeta.map((p) => ({
        href: p?.href,
        name: p?.name ?? '',
        description: p?.description ?? ''
      }));
      let idx = 0;
      return pointsMeta.map((pt) => {
        idx++;
        if (pt.href) {
          const id = pt.href.split('/').slice(-1)[0] ?? '';
          const wpt = this.skres.fromCache('waypoints', id);
          return wpt
            ? {
                index: idx,
                name: `* ${wpt[1].name}`,
                description: `* ${wpt[1].description}`
              }
            : {
                index: idx,
                name: '!wpt reference!',
                description: ''
              };
        }
        return {
          index: idx,
          name: pt.name || `RtePt-${('000' + String(idx)).slice(-3)}`,
          description: pt.description ?? ``
        };
      });
    }
    let idx = 0;
    return this._route().feature.geometry.coordinates.map(() => {
      return {
        index: idx,
        name: `RtePt-${('000' + String(++idx)).slice(-3)}`,
        description: ''
      };
    });
  }

  protected onEdit() {
    const id = this.id();
    if (id) {
      this.edit.emit(id);
    }
  }

  protected onReverse() {
    this.course.courseReverse();
  }

  protected onGoto(index?: number) {
    if (this.points().length < 2) {
      return;
    }
    if (index === -1) {
      this.course.clearCourse();
      return;
    }
    const id = this.id();
    if (!id) {
      return;
    }
    if (typeof index === 'undefined') {
      this.activate.emit(id);
    } else {
      this.course.activateRoute(id, index);
    }
  }

  protected onDelete() {
    const id = this.id();
    if (id) {
      this.skres.deleteRoute(id);
    }
  }

  protected onPanTo() {
    const zoomTo =
      this.app.config.map.zoomLevel < this.app.config.resources.notes.minZoom
        ? this.app.config.resources.notes.minZoom
        : null;

    const center = this._route().feature.geometry.coordinates[0];
    if (!center) {
      return;
    }
    this.panTo.emit({
      center: center as Position,
      zoomLevel: zoomTo
    });
  }

  protected showNote(id: string) {
    this.skres.showNoteDetails(id);
  }

  protected arrangePoints() {
    const id = this.id();
    if (!id) {
      return;
    }
    this.bottomSheet
      .open(ActiveResourcePropertiesModal, {
        disableClose: true,
        data: {
          title: 'Route Properties',
          resource: [id, this._route(), false],
          type: 'route',
          noButtons: true
        }
      })
      .afterDismissed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {});
  }

  /**
   * @description Show select Group dialog
   * @param id route identifier
   */
  protected async addToGroup() {
    const routeId = this.id();
    if (!routeId) {
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
        .afterClosed()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(async (selGrp) => {
          if (selGrp) {
            try {
              await this.skgroups.addToGroup(selGrp.id, 'route', routeId);
              this.alarm.showMessage(`Route added to group.`);
            } catch (err) {
              this.alarm.parseHttpErrorResponse(err as HttpErrorResponse);
            }
          }
        });
    } catch (err) {
      this.alarm.parseHttpErrorResponse(err as HttpErrorResponse);
    }
  }
}
