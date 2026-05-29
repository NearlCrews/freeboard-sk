import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  signal,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  FbBottomSheetRef,
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbIconComponent,
  FbToolbarComponent,
  FbTooltipDirective,
  FB_BOTTOM_SHEET_DATA
} from 'src/app/design-system/primitives';
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { moveItemInArray, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import type { FBRoute, FBWaypoint, Position } from 'src/app/types';
import { AppFacade } from 'src/app/app.facade';

import { GeoUtils } from 'src/app/lib/geoutils';
import { SKResourceService } from '../resources.service';
import { CourseService } from '../../course';
import { Convert } from 'src/app/lib/convert';

interface CoordinatesMetaEntry {
  name?: string;
  description?: string;
  href?: string;
}

@Component({
  selector: 'ap-dest-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FbButtonComponent,
    FbCardComponent,
    FbCardContentComponent,
    FbIconComponent,
    FbToolbarComponent,
    FbTooltipDirective,
    CdkDrag,
    CdkDropList
  ],
  template: `
    <div class="_ap-dest flex flex-col">
      <div>
        <fb-toolbar class="bg-transparent">
          <span fbToolbarLeading>
            @if (!data.noButtons) {
              @if (showClearButton()) {
                <fb-button
                  variant="ghost"
                  (pressed)="deactivate()"
                  [fbTooltip]="clearButtonText"
                >
                  <fb-icon name="clear_all" ariaLabel=""></fb-icon>
                  Clear
                </fb-button>
              } @else {
                <fb-button
                  variant="primary"
                  (pressed)="startAt()"
                  fbTooltip="Start at nearest point."
                >
                  <fb-icon name="near_me" ariaLabel=""></fb-icon>
                  Start
                </fb-button>
              }
            }
          </span>
          <span
            fbToolbarTitle
            style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
          >
            {{ data.title }}
          </span>
          <span fbToolbarActions>
            <fb-button
              variant="ghost"
              ariaLabel="Close"
              (pressed)="close()"
              fbTooltip="Close"
              fbTooltipPosition="below"
            >
              <fb-icon name="keyboard_arrow_down" ariaLabel=""></fb-icon>
            </fb-button>
          </span>
        </fb-toolbar>
      </div>

      <div
        style="flex: 1 1 auto;position:relative;overflow:hidden;min-height:200px;"
      >
        <div
          style="top:0;left:0;right:0;bottom:0;position:absolute;
                    overflow:auto;"
          cdkDropList
          (cdkDropListDropped)="drop($event)"
        >
          @for (pt of points; track pt; let i = $index) {
            <fb-card cdkDrag [cdkDragDisabled]="readOnly">
              <fb-card-content style="padding:var(--space-xs);">
                <div class="point-drop-placeholder" *cdkDragPlaceholder></div>

                <div
                  class="flex"
                  [style.cursor]="
                    points.length > 1 && selIndex() !== -1
                      ? 'pointer'
                      : 'initial'
                  "
                >
                  <div style="width:35px;">
                    @if (selIndex() === i) {
                      <fb-icon
                        name="flag"
                        ariaLabel=""
                        class="icon-warn"
                      ></fb-icon>
                    } @else {
                      @if (!data.noButtons) {
                        <fb-button
                          variant="ghost"
                          ariaLabel="Go to"
                          fbTooltip="Go to"
                          (pressed)="startAt(i)"
                        >
                          <fb-icon name="near_me" ariaLabel=""></fb-icon>
                        </fb-button>
                      }
                    }
                  </div>
                  <div class="flex-auto">
                    <div class="flex">
                      <div class="key-label"></div>
                      <div
                        style="flex: 1 1 auto;font-weight:bold;"
                        [innerText]="pointMeta[i]?.name ?? ''"
                      ></div>
                    </div>

                    @if (pointMeta[i]?.description) {
                      <div class="flex">
                        <div class="key-label">Desc:</div>
                        <div
                          class="flex-auto"
                          [innerText]="pointMeta[i]?.description ?? ''"
                        ></div>
                      </div>
                    }

                    <div class="flex">
                      <div class="key-label"></div>
                      <div style="flex: 1 1 auto;font-style:italic">
                        <span [innerText]="legs[i]?.bearing ?? ''"></span>
                        &nbsp;
                        <span [innerText]="legs[i]?.distance ?? ''"></span>
                      </div>
                    </div>
                  </div>
                  @if (!readOnly && data.type === 'route') {
                    <div
                      cdkDragHandle
                      fbTooltip="Drag to re-order points"
                      style="cursor:grab"
                    >
                      <fb-icon name="drag_indicator" ariaLabel=""></fb-icon>
                    </div>
                  }
                </div>
              </fb-card-content>
            </fb-card>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      ._ap-dest {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-dest .key-label {
        width: 20px;
        font-weight: bold;
      }
      ._ap-dest .selected {
        background-color: silver;
      }
      .point-drop-placeholder {
        background: #ccc;
        border: dotted 3px #999;
        min-height: 60px;
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
      .cdk-drag-preview {
        box-sizing: border-box;
        border-radius: var(--radius-sm);
        box-shadow:
          0 5px 5px -3px rgba(0, 0, 0, 0.2),
          0 8px 10px 1px rgba(0, 0, 0, 0.14),
          0 3px 14px 2px rgba(0, 0, 0, 0.12);
      }
      @media (prefers-reduced-motion: reduce) {
        .point-drop-placeholder {
          transition: none;
        }
      }
    `
  ]
})
export class ActiveResourcePropertiesModal implements OnInit {
  protected points: Position[] = [];
  protected pointMeta: { name: string; description: string }[] = [];
  protected legs: { bearing: string; distance: string }[] = [];
  protected selIndex = signal<number>(-1);
  protected clearButtonText = 'Clear';
  protected showClearButton = signal<boolean>(false);
  protected readOnly = false;
  protected closestPoint = signal<number>(-1);

  protected app = inject(AppFacade);
  protected modalRef = inject(FbBottomSheetRef) as FbBottomSheetRef<
    unknown,
    ActiveResourcePropertiesModal
  >;
  protected course = inject(CourseService);
  protected skres = inject(SKResourceService);
  protected data = inject<{
    title: string;
    type: string;
    resource: FBRoute | FBWaypoint;
    noButtons: boolean;
  }>(FB_BOTTOM_SHEET_DATA);

  constructor() {}

  ngOnInit() {
    const resource = this.data.resource[1];
    if (resource.feature && resource.feature.geometry.coordinates) {
      if (this.data.type === 'route') {
        // Route coordinates: LineString [Position, Position, ...]
        const coords = resource.feature.geometry.coordinates as Position[];
        this.points = [...coords];
        this.legs = this.getLegs();

        this.data.title = resource.name
          ? `${resource.name} Points`
          : 'Route Points';

        if (this.data.resource[0] === this.app.data.activeRoute) {
          this.selIndex.update(() => this.course.courseData().pointIndex);
          this.showClearButton.set(true);
        }
        this.readOnly =
          (resource.feature.properties?.['readOnly'] as boolean) ?? false;
        this.pointMeta = this.getPointsMeta();
      }
    }
  }

  getLegs() {
    const pos = this.app.data.vessels.self.position ?? undefined;
    return GeoUtils.routeLegs(this.points, pos).map((l) => {
      return {
        bearing: this.app.formatValueForDisplay(l.bearing, 'deg'),
        distance: this.app.formatValueForDisplay(l.distance, 'm')
      };
    });
  }

  private getCoordinatesMeta(): CoordinatesMetaEntry[] | undefined {
    const cm = this.data.resource[1].feature.properties?.['coordinatesMeta'];
    return Array.isArray(cm) ? (cm as CoordinatesMetaEntry[]) : undefined;
  }

  getPointsMeta() {
    const cm = this.getCoordinatesMeta();
    if (cm) {
      return cm.map((p, i) => ({
        name: p?.name ?? `RtePt-${String(i + 1).padStart(3, '0')}`,
        description: p?.description ?? ''
      }));
    }
    return this.points.map((_, i) => ({
      name: `RtePt-${String(i + 1).padStart(3, '0')}`,
      description: ''
    }));
  }

  drop(e: CdkDragDrop<{ previousIndex: number; currentIndex: number }>) {
    if (this.data.type === 'route') {
      const selPosition = this.points[this.selIndex()];
      moveItemInArray(this.points, e.previousIndex, e.currentIndex);
      this.legs = this.getLegs();
      const cm = this.getCoordinatesMeta();
      if (cm) {
        moveItemInArray(cm, e.previousIndex, e.currentIndex);
      }
      moveItemInArray(this.pointMeta, e.previousIndex, e.currentIndex);

      if (selPosition) {
        this.updateFlag(selPosition);
      }
      this.skres.updateRouteCoords(this.data.resource[0], this.points, cm);
    }
  }

  updateFlag(selPosition: Position) {
    if (!selPosition) {
      return;
    }
    let idx = 0;
    this.points.forEach((p: Position) => {
      if (p[0] === selPosition[0] && p[1] === selPosition[1]) {
        this.selIndex.set(idx);
      }
      idx++;
    });
  }

  close() {
    this.modalRef.dismiss();
  }

  /** Activate route starting at nearest point */
  startAt(idx = -1) {
    if (this.points.length < 2) {
      return;
    }
    if (idx === -1) {
      const coords = this.data.resource[1].feature.geometry
        .coordinates as Position[];
      const vesselPos = this.app.data.vessels.self.position;
      if (!vesselPos) {
        return;
      }
      const cpi = GeoUtils.closestForwardPoint(
        coords,
        vesselPos,
        Convert.radiansToDegrees(this.app.data.vessels.self.heading ?? 0)
      );
      if (cpi === -1) {
        this.app.showAlert('Start Route', 'Closest point is behind vessel!');
        return;
      }
      idx = cpi;
    }
    this.selIndex.update(() => idx);
    this.showClearButton.set(true);
    this.course.activateRoute(this.data.resource[0], idx);
  }

  /** deactivate route / clear destination */
  deactivate() {
    this.selIndex.set(-1);
    this.showClearButton.set(false);
    this.course.clearCourse();
  }
}
