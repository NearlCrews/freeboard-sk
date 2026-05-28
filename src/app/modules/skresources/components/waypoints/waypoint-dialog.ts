import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { form, FormField, max, min, required } from '@angular/forms/signals';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { AppFacade } from 'src/app/app.facade';
import { CoordsPipe } from 'src/app/lib/pipes';
import type { SKWaypoint } from '../../resource-classes';
import type { AppIconDef } from 'src/app/modules/icons';
import { getResourceIcon, getSvgList } from 'src/app/modules/icons';
import { MatTooltip } from '@angular/material/tooltip';

import {
  FbButtonComponent,
  FbSelectComponent,
  FbSelectOptionTemplateDirective,
  FbSelectTriggerDirective,
  FbToolbarComponent,
  type FbSelectGroup
} from 'src/app/design-system/primitives';

const waypointTypeDef = {
  default: {
    icon: getResourceIcon('waypoints'),
    group: 'Points of Interest',
    displayName: 'Waypoint'
  },
  pseudoaton: {
    icon: getResourceIcon('waypoints', 'pseudoaton'),
    group: 'Points of Interest',
    displayName: 'Pseudo AtoN'
  },
  whale: {
    icon: getResourceIcon('waypoints', 'whale'),
    group: 'Points of Interest',
    displayName: 'Whale Sighting'
  },
  pob: {
    icon: getResourceIcon('waypoints', 'pob'),
    group: 'Alarms',
    displayName: 'Person Overboard'
  },
  'start-boat': {
    icon: getResourceIcon('waypoints', 'start-boat'),
    group: 'Racing',
    displayName: 'Start Boat'
  },
  'start-pin': {
    icon: getResourceIcon('waypoints', 'start-pin'),
    group: 'Racing',
    displayName: 'Start Pin'
  }
};

interface DialogData {
  title: string; // title text,
  addMode: boolean; // Add vs update waypoint,
  waypoint: SKWaypoint; // Waypoint resource
}

interface WaypointTypeOption {
  type: string;
  name: string;
  icon: AppIconDef;
}

@Component({
  selector: 'ap-waypointdialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatIconModule,
    FbButtonComponent,
    MatCheckboxModule,
    MatDialogModule,
    CoordsPipe,
    FormField,
    MatTooltip,
    FbSelectComponent,
    FbSelectOptionTemplateDirective,
    FbSelectTriggerDirective,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-waypoint">
      <fb-toolbar style="background-color: transparent">
        <div fbToolbarLeading>
          <mat-icon class="icon-waypoint">{{ dialogIcon }}</mat-icon>
        </div>
        <span fbToolbarTitle>{{ data.title }}</span>
        <div fbToolbarActions style="width: 50px; text-align: right;">
          <fb-button
            variant="ghost"
            ariaLabel="Close"
            (pressed)="handleClose(false)"
          >
            <mat-icon>close</mat-icon>
          </fb-button>
        </div>
      </fb-toolbar>
      <mat-dialog-content>
        <div style="display: flex">
          <div style="flex: 1 1 auto">
            <div>
              <mat-form-field floatLabel="always" style="width:100%;">
                <mat-label>Name</mat-label>
                <input matInput type="text" [formField]="wptForm.name" />
                @if (
                  wptForm.name().invalid() &&
                  (wptForm.name().dirty() || wptForm.name().touched())
                ) {
                  <mat-error>{{ errorMessage() }}</mat-error>
                }
              </mat-form-field>
            </div>
            <div>
              <mat-form-field floatLabel="always" style="width:100%;">
                <mat-label>Description</mat-label>
                <textarea
                  matInput
                  rows="3"
                  #inpcmt="ngModel"
                  [readonly]="wptReadOnly"
                  [(ngModel)]="wptDescription"
                >
                </textarea>
              </mat-form-field>
            </div>
            <!-- select icon type / category-->
            <div style="display:flex;flex-wrap:wrap;">
              <div style="min-width: 220px;">
                <label
                  for="waypoint-type"
                  style="display: block; font-weight: 600;"
                >
                  Type
                </label>
                <fb-select
                  name="waypoint-type"
                  ariaLabel="Waypoint type"
                  [groups]="waypointTypeGroups"
                  [disabled]="wptReadOnly"
                  [value]="wptType"
                  (valueChange)="handleWptTypeChange($event)"
                >
                  <ng-template fbSelectOption let-option>
                    <span
                      style="display: inline-flex; align-items: center; gap: 8px;"
                    >
                      @if (optionIcon(option); as icn) {
                        @if (icn.svgIcon) {
                          <mat-icon
                            [svgIcon]="icn.svgIcon"
                            [class]="icn.class ?? ''"
                          ></mat-icon>
                        } @else {
                          <mat-icon [class]="icn.class ?? ''">{{
                            icn.name
                          }}</mat-icon>
                        }
                      }
                      {{ option.label }}
                    </span>
                  </ng-template>
                  <span fb-select-trigger>
                    <span
                      style="display: inline-flex; align-items: center; gap: 8px;"
                    >
                      @if (wptIcon().svgIcon) {
                        <mat-icon
                          [svgIcon]="wptIcon().svgIcon"
                          [class]="wptIcon().class ?? ''"
                        ></mat-icon>
                      } @else {
                        <mat-icon [class]="wptIcon().class ?? ''">{{
                          wptIcon().name
                        }}</mat-icon>
                      }
                      {{ wptIconDisplayName }}
                    </span>
                  </span>
                </fb-select>
              </div>

              @if (iconsForSelection().length !== 0) {
                <div>
                  <div
                    style="display:flex;flex-wrap:wrap;padding-bottom:10px;height:40px;"
                  >
                    @for (i of iconsForSelection(); track i) {
                      <div
                        style="background-color:silver;padding:2px;"
                        [ngClass]="{
                          'selected-icon': i.svgIcon === this.wptIcon().svgIcon,
                          'unselected-icon':
                            i.svgIcon !== this.wptIcon().svgIcon
                        }"
                        (click)="handleIconSelected(i.svgIcon)"
                      >
                        <mat-icon
                          [svgIcon]="i.svgIcon"
                          [matTooltip]="i.svgIcon"
                        ></mat-icon>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <div style="font-size: 10pt;display:flex;flex-wrap:wrap">
              <div style="display:flex;">
                @if (wptReadOnly) {
                  <div style="width:45px;font-weight:bold;">Lat:</div>
                  <div
                    style="flex: 1 1 auto;"
                    [innerText]="
                      wptLat | coords: app.config.units.positionFormat : true
                    "
                  ></div>
                } @else {
                  <div style="flex: 1 1 auto;">
                    <mat-form-field floatLabel="always">
                      <mat-label>Latitude</mat-label>
                      <input matInput type="number" [formField]="wptForm.lat" />
                      @if (
                        wptForm.lat().invalid() &&
                        (wptForm.lat().dirty() || wptForm.lat().touched())
                      ) {
                        <mat-error>{{ errorMessage() }}</mat-error>
                      }
                    </mat-form-field>
                  </div>
                }
              </div>
              <div style="display:flex;padding-left: 5px;">
                @if (wptReadOnly) {
                  <div style="width:45px;font-weight:bold;">Lon:</div>
                  <div
                    style="flex: 1 1 auto;"
                    [innerText]="
                      wptLon | coords: app.config.units.positionFormat
                    "
                  ></div>
                } @else {
                  <div style="flex: 1 1 auto;">
                    <mat-form-field floatLabel="always">
                      <mat-label>Longitude</mat-label>
                      <input matInput type="number" [formField]="wptForm.lon" />
                      @if (
                        wptForm.lon().invalid() &&
                        (wptForm.lon().dirty() || wptForm.lon().touched())
                      ) {
                        <mat-error>{{ errorMessage() }}</mat-error>
                      }
                    </mat-form-field>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </mat-dialog-content>
      @if (!wptReadOnly) {
        <mat-dialog-actions align="end">
          <fb-button
            variant="primary"
            [disabled]="saveDisabled() || wptReadOnly"
            (pressed)="handleClose(true)"
          >
            SAVE
          </fb-button>
        </mat-dialog-actions>
      }
    </div>
  `,
  styles: [
    `
      ._ap-waypoint {
        min-width: 300px;
      }

      ._ap-waypoint .selected-icon {
        border: red 2px solid;
      }

      ._ap-waypoint .unselected-icon {
        border: black 1px solid;
      }
    `
  ]
})
export class WaypointDialog {
  protected dialogIcon: string;
  protected wptIcon = signal<AppIconDef>({});
  protected waypointTypeSelections: Map<string, WaypointTypeOption[]>;
  protected waypointTypeGroups: readonly FbSelectGroup<string>[];
  protected wptIconDisplayName = '';

  protected wptType: string;
  protected wptDescription: string;
  protected wptReadOnly = false;
  protected wptLat: number;
  protected wptLon: number;

  protected skIcon: string | undefined;

  protected wptModel = signal<{
    name: string;
    lat: number | null;
    lon: number | null;
  }>({ name: '', lat: 0, lon: 0 });
  protected wptForm = form(this.wptModel, (p) => {
    required(p.name, { message: 'Please enter a waypoint name.' });
    required(p.lat, { message: 'You must enter a value.' });
    required(p.lon, { message: 'You must enter a value.' });
    min(p.lat, -90, { message: 'Value must be > -90 and < 90' });
    max(p.lat, 90, { message: 'Value must be > -90 and < 90' });
    min(p.lon, -180, { message: 'Value must be > -180 and < 180' });
    max(p.lon, 180, { message: 'Value must be > -180 and < 180' });
  });
  protected errorMessage = computed(() => {
    const errs = this.wptForm().errorSummary();
    const first = errs[0];
    return first?.message ?? '';
  });
  protected saveDisabled = computed(() => this.wptForm().invalid());

  protected iconsForSelection = signal<AppIconDef[]>([]);
  protected selectableIcons = ['pseudoaton'];

  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<WaypointDialog>);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);

  constructor() {
    this.dialogIcon = this.data.addMode ? 'add_location' : 'edit_location';

    this.wptIcon.update(() => this.getIconDef(this.data.waypoint));
    this.wptIconDisplayName = this.getFriendlyIconName(this.data.waypoint);

    this.wptType = this.data.waypoint.type ?? '';
    this.wptDescription = this.data.waypoint.description ?? '';
    this.wptReadOnly =
      (this.data.waypoint.feature.properties?.['readOnly'] as boolean) ?? false;
    const coords = this.data.waypoint.feature.geometry.coordinates ?? [0, 0];
    this.wptLat = coords[1] ?? 0;
    this.wptLon = coords[0] ?? 0;

    this.wptModel.set({
      name: this.data.waypoint.name ?? '',
      lat: this.wptLat,
      lon: this.wptLon
    });

    this.waypointTypeSelections = this.buildWptSelections();
    this.waypointTypeGroups = this.buildWptGroups(this.waypointTypeSelections);
  }

  /**
   * Resolve the icon descriptor for an option rendered inside fb-select.
   * The option payload carries the AppIconDef in `data`; the projected
   * template only sees the option object so this helper bridges the gap.
   */
  protected optionIcon(option: { data?: unknown }): AppIconDef | null {
    const d = option.data;
    if (d && typeof d === 'object') {
      return d as AppIconDef;
    }
    return null;
  }

  private buildWptGroups(
    selections: Map<string, WaypointTypeOption[]>
  ): readonly FbSelectGroup<string>[] {
    const groups: FbSelectGroup<string>[] = [];
    for (const [label, items] of selections) {
      groups.push({
        label,
        options: items.map((i) => ({
          id: i.type,
          label: i.name,
          data: i.icon
        }))
      });
    }
    return groups;
  }

  protected handleClose(save: boolean) {
    if (save) {
      const v = this.wptModel();
      this.data.waypoint.name = v.name ?? '';
      this.data.waypoint.description = this.wptDescription;
      this.data.waypoint.type = this.wptType;
      this.data.waypoint.feature.geometry.coordinates = [
        v.lon ?? 0,
        v.lat ?? 0
      ];
      const props = this.data.waypoint.feature.properties ?? {};
      if (this.skIcon) {
        props['skIcon'] = this.skIcon;
      } else {
        delete props['skIcon'];
      }
      this.data.waypoint.feature.properties = props;
    }
    this.dialogRef.close({ save: save, waypoint: this.data.waypoint });
  }

  private buildWptSelections(): Map<string, WaypointTypeOption[]> {
    const wt = Object.entries(waypointTypeDef);
    const groups = new Map<string, WaypointTypeOption[]>();
    wt.forEach(([key, def]) => {
      let bucket = groups.get(def.group);
      if (!bucket) {
        bucket = [];
        groups.set(def.group, bucket);
      }
      bucket.push({
        type: key === 'default' ? '' : key,
        name: def.displayName,
        icon: def.icon
      });
    });
    return groups;
    /*return [
      {
        group: 'Points of Interest',
        icons: [
          {
            type: '',
            name: 'Waypoint',
            icon: waypointTypeDef.default.icon
          },
          {
            type: 'pseudoaton',
            name: 'Pseudo AtoN',
            icon: waypointTypeDef.pseudoaton.icon
          },
          {
            type: 'whale',
            name: 'Whale Sighting',
            icon: waypointTypeDef.whale.icon
          }
        ]
      },
      {
        group: 'Racing',
        icons: [
          {
            type: 'start-boat',
            name: 'Start Boat',
            icon: waypointTypeDef['start-boat'].icon
          },
          {
            type: 'start-pin',
            name: 'Start Pin',
            icon: waypointTypeDef['start-pin'].icon
          }
        ]
      },
      {
        group: 'Alarms',
        icons: [
          {
            type: 'pob',
            name: 'Person Overboard',
            icon: waypointTypeDef.pob.icon
          }
        ]
      }
    ]*/
  }

  private getFriendlyIconName(w: SKWaypoint): string {
    const skIcon = w.feature.properties?.['skIcon'] as string | undefined;
    if (!skIcon) {
      return !w.type ? 'Waypoint' : w.type.replaceAll('-', ' ');
    }
    return skIcon.replaceAll('-', ' ');
  }

  /** return the waypoint icon definition */
  private getIconDef(wpt?: SKWaypoint): AppIconDef {
    return getResourceIcon('waypoints', wpt ?? this.data.waypoint);
  }

  protected handleWptTypeChange(next: string | null) {
    this.wptType = next ?? '';
    const w: SKWaypoint = { ...this.data.waypoint };
    w.type = this.wptType;
    if (w.feature.properties) {
      delete w.feature.properties['skIcon'];
    }
    this.wptIconDisplayName = this.getFriendlyIconName(w);
    this.wptIcon.update(() => this.getIconDef(w));
    this.iconsForSelection.set([]);
    this.skIcon = undefined;
    this.handleChangeIcon();
  }

  private handleChangeIcon() {
    if (this.wptType === 'pseudoaton') {
      const { svgIcon } = getResourceIcon('waypoints', 'pseudoaton');
      const d: AppIconDef[] = getSvgList()
        .filter((i) => i.id.includes('virtual-'))
        .map((i) => ({ svgIcon: i.id }));
      if (svgIcon) {
        d.unshift({ svgIcon });
      }
      this.iconsForSelection.update(() => d);
    } else {
      this.iconsForSelection.set([]);
    }
  }

  protected handleIconSelected(skIcon: string | undefined) {
    if (!skIcon) return;
    this.skIcon = skIcon;
    const w: SKWaypoint = { ...this.data.waypoint };
    const props = w.feature.properties ?? {};
    props['skIcon'] = skIcon;
    w.feature.properties = props;
    this.wptIconDisplayName = this.getFriendlyIconName(w);
    this.wptIcon.update(() => this.getIconDef(w));
  }
}
