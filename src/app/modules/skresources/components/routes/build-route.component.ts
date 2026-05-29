import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  signal,
  output,
  inject,
  AfterViewInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';

import {
  FbButtonComponent,
  FbCardComponent,
  FbIconComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import {
  CdkDragDrop,
  moveItemInArray,
  copyArrayItem,
  CdkDrag,
  CdkDropList
} from '@angular/cdk/drag-drop';
import { SKResourceService } from '../../resources.service';
import { FBWaypoint, LineString, Position } from 'src/app/types';

interface BuildRoutePoint {
  id: string;
  name: string;
  position: Position;
  href: string;
}

@Component({
  selector: 'route-builder',
  imports: [
    CdkDrag,
    CdkDropList,
    FbButtonComponent,
    FbCardComponent,
    FbIconComponent,
    FbTooltipDirective,
    FormsModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./build-route.component.css'],
  template: `
    <fb-card>
      <div class="rte-builder fb-app-background" cdkDrag>
        <div class="title" cdkDragHandle>
          <div>
            <fb-button
              variant="ghost"
              ariaLabel="Refresh Waypoint list"
              fbTooltip="Refresh Waypoint list"
              (pressed)="getWaypoints()"
            >
              <fb-icon name="refresh" ariaLabel=""></fb-icon>
            </fb-button>
          </div>
          <div
            style="flex: 1 1 auto;
            font-size: var(--font-size-lg);
            line-height: 2.5em;
            text-align: center;
            cursor: grab;"
          >
            Build Route:
          </div>
          <div>
            <fb-button
              variant="ghost"
              ariaLabel="Close"
              (pressed)="handleClose()"
            >
              <fb-icon name="close" ariaLabel=""></fb-icon>
            </fb-button>
          </div>
        </div>

        <div class="content">
          <div class="flex">
            <div class="wptlist-container">Waypoints</div>
            <div class="wptlist-container">Route</div>
          </div>

          <div class="wptlists">
            <div class="wptlist-container">
              <div
                class="wpt-list"
                id="wpt-list"
                cdkDropList
                #wptList="cdkDropList"
                [cdkDropListData]="wpts()"
                [cdkDropListConnectedTo]="[rteptList]"
                (cdkDropListDropped)="dropEventHandler($event)"
              >
                @for (item of wpts(); track item) {
                  <div class="wpt-box" cdkDrag>
                    <div style="width:40px;">
                      <fb-icon name="room" ariaLabel=""></fb-icon>
                    </div>
                    <div class="wpt-text" [fbTooltip]="item.name">
                      {{ item.name }}
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="wptlist-container">
              <div
                class="wpt-list"
                id="rte-list"
                cdkDropList
                #rteptList="cdkDropList"
                [cdkDropListData]="rtepts"
                (cdkDropListDropped)="dropEventHandler($event)"
              >
                @for (item of rtepts; track item; let idx = $index) {
                  <div class="wpt-box" fb-app-background cdkDrag>
                    <div style="width:40px;">
                      <fb-icon name="room" ariaLabel=""></fb-icon>
                    </div>
                    <div class="wpt-text" [fbTooltip]="item.name">
                      {{ item.name }}
                    </div>
                    <div style="width:40px;">
                      <fb-button
                        variant="ghost"
                        ariaLabel="Delete"
                        (pressed)="deleteFromRoute(idx)"
                      >
                        <fb-icon name="delete" ariaLabel=""></fb-icon>
                      </fb-button>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <div style="text-align:center;padding: var(--space-xs);">
          <fb-button
            variant="primary"
            [disabled]="rtepts.length < 2"
            (pressed)="doSave()"
          >
            <fb-icon name="save" ariaLabel=""></fb-icon>&nbsp;Save
          </fb-button>
        </div>
      </div>
    </fb-card>
  `
})
export class BuildRouteComponent implements AfterViewInit {
  wpts = signal<BuildRoutePoint[]>([]);
  rtepts: BuildRoutePoint[] = [];

  save = output<{
    coordinates: LineString;
    meta?: { href?: string; name?: string }[];
  }>();
  close = output<void>();

  protected app = inject(AppFacade);
  private skres = inject(SKResourceService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  constructor() {}

  ngAfterViewInit() {
    this.getWaypoints();
    this.cdr.detectChanges();
  }

  /**
   * @description Fetch all waypoints from server
   */
  protected async getWaypoints() {
    const wptList = await this.skres.listFromServer<FBWaypoint>('waypoints');
    const wmap = wptList
      .map((w: FBWaypoint) => {
        return {
          id: w[0],
          name: w[1].name,
          position: w[1].feature.geometry.coordinates,
          href: `/resources/waypoints/${w[0]}`
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    this.wpts.set(wmap);
  }

  deleteFromRoute(index: number) {
    this.rtepts.splice(index, 1);
  }

  dropEventHandler(event: CdkDragDrop<BuildRoutePoint[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      copyArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  handleClose() {
    if (this.rtepts.length !== 0) {
      this.app
        .showConfirm(
          'Changes have not been saved.\nDo you want to save?',
          'Unsaved Changes'
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((res: { ok: boolean } | undefined) => {
          if (res?.ok) {
            this.doSave();
          } else {
            this.close.emit();
          }
        });
    } else {
      this.close.emit();
    }
  }

  doSave() {
    const rte: {
      coordinates: LineString;
      meta: { href?: string; name?: string }[];
    } = {
      coordinates: [],
      meta: []
    };

    this.rtepts.forEach((pt) => {
      rte.coordinates.push(pt.position);
      if (pt.href) {
        rte.meta.push({ href: pt.href });
      } else {
        rte.meta.push({ name: pt.name });
      }
    });

    this.save.emit(rte);
    this.close.emit();
  }
}
