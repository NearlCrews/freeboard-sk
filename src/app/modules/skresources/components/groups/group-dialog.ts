import type { OnInit, AfterViewInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { form, FormField, required } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog
} from '@angular/material/dialog';

import {
  FbButtonComponent,
  FbCheckboxComponent,
  FbIconComponent,
  FbInputComponent,
  FbListComponent,
  FbListItemComponent,
  FbTabPanelDirective,
  FbTabsComponent,
  FbTextareaComponent,
  FbToolbarComponent,
  type FbTabDef
} from 'src/app/design-system/primitives';
import type { SKResourceGroup } from './groups.service';
import type { SKResourceType } from '../../resources.service';
import { SKResourceService } from '../../resources.service';
import type { FBChart, FBRegion, FBRoute, FBWaypoint } from 'src/app/types';
import { MultiSelectListDialog } from 'src/app/lib/components';
import type { AppIconDef } from 'src/app/modules/icons';

interface RListEntry {
  id: string;
  name: string;
}

interface GroupItem {
  name: string;
  description: string;
  routes: RListEntry[];
  waypoints: RListEntry[];
  regions: RListEntry[];
  charts: RListEntry[];
}

@Component({
  selector: 'ap-resourcegroupdialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    FbButtonComponent,
    FbCheckboxComponent,
    FbIconComponent,
    FbInputComponent,
    FbListComponent,
    FbListItemComponent,
    FbTabPanelDirective,
    FbTabsComponent,
    FbTextareaComponent,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-group">
      <fb-toolbar style="background-color: transparent">
        <div fbToolbarLeading>
          <mat-icon class="icon-region">category</mat-icon>
        </div>
        <span fbToolbarTitle>
          {{ this.data.addMode ? 'New Group' : 'Group Information' }}
        </span>
        <div fbToolbarActions style="width: 50px; text-align: right;">
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

      <mat-dialog-content>
        <fb-tabs
          [tabs]="visibleTabs()"
          [activeId]="activeTabId()"
          (activeIdChange)="onTabChange($event)"
        >
          <ng-template fbTabPanel fbTabPanelId="details">
            <div style="padding-top: 10px;">
              <div>
                <label for="group-name" style="display:block; font-weight:600">
                  Name
                </label>
                <fb-input type="text" [formField]="gForm.name"></fb-input>
                @if (
                  gForm.name().invalid() &&
                  (gForm.name().dirty() || gForm.name().touched())
                ) {
                  <div style="color: var(--color-error); font-size:12px">
                    Please enter a name.
                  </div>
                }
              </div>
              <div>
                <label
                  for="group-description"
                  style="display:block; font-weight:600"
                >
                  Description
                </label>
                <fb-textarea [formField]="gForm.description"></fb-textarea>
              </div>
            </div>
          </ng-template>
          @if (!this.data.addMode) {
            <ng-template fbTabPanel fbTabPanelId="routes">
              @if (!gItem.routes.length) {
                <fb-checkbox
                  [checked]="mask.routes"
                  (checkedChange)="mask.routes = $event"
                  >Hide routes.</fb-checkbox
                >
              }
              <fb-list>
                @for (i of gItem.routes; track i.id) {
                  <fb-list-item>
                    <div style="display:flex;">
                      <div
                        style="flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis;whitespace: pre;"
                      >
                        {{ i.name }}
                      </div>
                      <div>
                        <fb-button
                          variant="ghost"
                          size="sm"
                          ariaLabel="Remove"
                          matTooltip="Remove"
                          (pressed)="removeItem('route', i.id)"
                        >
                          <mat-icon class="icon-warn">delete</mat-icon>
                        </fb-button>
                      </div>
                    </div>
                  </fb-list-item>
                }
              </fb-list>
            </ng-template>

            <ng-template fbTabPanel fbTabPanelId="waypoints">
              @if (!gItem.waypoints.length) {
                <fb-checkbox
                  [checked]="mask.waypoints"
                  (checkedChange)="mask.waypoints = $event"
                  >Hide waypoints.</fb-checkbox
                >
              }
              <fb-list>
                @for (i of gItem.waypoints; track i.id) {
                  <fb-list-item>
                    <div style="display:flex;">
                      <div
                        style="flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis;whitespace: pre;"
                      >
                        {{ i.name }}
                      </div>
                      <div>
                        <fb-button
                          variant="ghost"
                          size="sm"
                          ariaLabel="Remove"
                          matTooltip="Remove"
                          (pressed)="removeItem('waypoint', i.id)"
                        >
                          <mat-icon class="icon-warn">delete</mat-icon>
                        </fb-button>
                      </div>
                    </div>
                  </fb-list-item>
                }
              </fb-list>
            </ng-template>

            <ng-template fbTabPanel fbTabPanelId="regions">
              @if (!gItem.regions.length) {
                <fb-checkbox
                  [checked]="mask.regions"
                  (checkedChange)="mask.regions = $event"
                  >Hide regions.</fb-checkbox
                >
              }
              <fb-list>
                @for (i of gItem.regions; track i.id) {
                  <fb-list-item>
                    <div style="display:flex;">
                      <div
                        style="flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis;whitespace: pre;"
                      >
                        {{ i.name }}
                      </div>
                      <div>
                        <fb-button
                          variant="ghost"
                          size="sm"
                          ariaLabel="Remove"
                          matTooltip="Remove"
                          (pressed)="removeItem('region', i.id)"
                        >
                          <mat-icon class="icon-warn">delete</mat-icon>
                        </fb-button>
                      </div>
                    </div>
                  </fb-list-item>
                }
              </fb-list>
            </ng-template>

            <ng-template fbTabPanel fbTabPanelId="charts">
              <fb-list>
                @for (i of gItem.charts; track i.id) {
                  <fb-list-item>
                    <div style="display:flex;">
                      <div
                        style="flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis;whitespace: pre;"
                      >
                        {{ i.name }}
                      </div>
                      <div>
                        <fb-button
                          variant="ghost"
                          size="sm"
                          ariaLabel="Remove"
                          matTooltip="Remove"
                          (pressed)="removeItem('chart', i.id)"
                        >
                          <mat-icon class="icon-warn">delete</mat-icon>
                        </fb-button>
                      </div>
                    </div>
                  </fb-list-item>
                }
              </fb-list>
            </ng-template>
          }
        </fb-tabs>
      </mat-dialog-content>
      <mat-dialog-actions align="left">
        <div style="text-align:left;flex: 1;">
          <fb-button
            variant="primary"
            [disabled]="selTab === 0"
            (pressed)="addResources()"
            matTooltip="Add Resource"
          >
            ADD
          </fb-button>
        </div>
        <div style="text-align:right;flex: 1;">
          <fb-button
            variant="primary"
            [disabled]="saveDisabled()"
            (pressed)="handleClose(true)"
          >
            SAVE
          </fb-button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-group {
        min-width: 300px;
      }
    `
  ]
})
export class ResourceGroupDialog implements OnInit, AfterViewInit {
  protected gItem: GroupItem = {
    name: '',
    description: '',
    routes: [],
    waypoints: [],
    regions: [],
    charts: []
  };
  protected selTab = 0;
  protected activeTabId = signal<string>('details');
  protected wpts: RListEntry[] = [];

  private readonly tabOrder: readonly string[] = [
    'details',
    'routes',
    'waypoints',
    'regions',
    'charts'
  ];

  protected visibleTabs = computed<readonly FbTabDef[]>(() => {
    const base: FbTabDef[] = [{ id: 'details', label: 'Details' }];
    if (this.data.addMode) return base;
    return [
      ...base,
      { id: 'routes', label: 'Routes' },
      { id: 'waypoints', label: 'Waypoints' },
      { id: 'regions', label: 'Regions' },
      { id: 'charts', label: 'Charts' }
    ];
  });
  protected rtes: RListEntry[] = [];
  protected regions: RListEntry[] = [];
  protected charts: RListEntry[] = [];
  protected mask = {
    routes: false,
    waypoints: false,
    regions: false,
    charts: false
  };

  protected gModel = signal<{ name: string; description: string }>({
    name: '',
    description: ''
  });
  protected gForm = form(this.gModel, (p) => {
    required(p.name);
  });
  protected saveDisabled = computed(() => this.gForm().invalid());

  private dialogRef = inject(MatDialogRef<ResourceGroupDialog>);
  private skres = inject(SKResourceService);
  protected dialog = inject(MatDialog);
  protected data = inject<{
    addMode: boolean;
    group: SKResourceGroup;
  }>(MAT_DIALOG_DATA);
  private destroyRef = inject(DestroyRef);

  constructor() {}

  ngOnInit() {
    this.gItem = {
      name: this.data.group.name ?? '',
      description: this.data.group.description ?? '',
      routes: [],
      waypoints: [],
      regions: [],
      charts: []
    };
    this.gModel.set({
      name: this.gItem.name,
      description: this.gItem.description
    });
  }

  ngAfterViewInit() {
    const groupRoutes = this.data.group.routes;
    this.mask.routes = groupRoutes ? true : false;
    this.skres.listFromServer<FBRoute>('routes').then((r) => {
      if (groupRoutes) {
        r.forEach((rte) => {
          if (groupRoutes.includes(rte[0])) {
            this.gItem.routes.push({ id: rte[0], name: rte[1].name });
          }
        });
        this.sortIt(this.gItem.routes);
      }
    });
    const groupWaypoints = this.data.group.waypoints;
    this.mask.waypoints = groupWaypoints ? true : false;
    this.skres.listFromServer<FBWaypoint>('waypoints').then((w) => {
      if (groupWaypoints) {
        w.forEach((wpt) => {
          if (groupWaypoints.includes(wpt[0])) {
            this.gItem.waypoints.push({ id: wpt[0], name: wpt[1].name });
          }
        });
        this.sortIt(this.gItem.waypoints);
      }
    });
    const groupRegions = this.data.group.regions;
    this.mask.regions = groupRegions ? true : false;
    this.skres.listFromServer<FBRegion>('regions').then((c) => {
      if (groupRegions) {
        c.forEach((region) => {
          if (groupRegions.includes(region[0])) {
            this.gItem.regions.push({ id: region[0], name: region[1].name });
          }
        });
        this.sortIt(this.gItem.regions);
      }
    });
    const groupCharts = this.data.group.charts;
    this.skres.listFromServer<FBChart>('charts').then((c) => {
      if (groupCharts) {
        c.forEach((cht) => {
          if (groupCharts.includes(cht[0])) {
            this.gItem.charts.push({ id: cht[0], name: cht[1].name });
          }
        });
        this.sortIt(this.gItem.charts);
      }
    });

    this.bgLoadResources();
  }

  removeItem(itemType: string, id: string) {
    const items: RListEntry[] =
      itemType === 'route'
        ? this.gItem.routes
        : itemType === 'waypoint'
          ? this.gItem.waypoints
          : itemType === 'region'
            ? this.gItem.regions
            : itemType === 'chart'
              ? this.gItem.charts
              : [];

    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      items.splice(idx, 1);
    }
  }

  handleClose(save: boolean) {
    if (save) {
      const v = this.gModel();
      this.data.group.name = v.name;
      this.data.group.description = v.description;

      if (this.gItem.routes.length !== 0) {
        this.data.group.routes = this.gItem.routes.map((r) => r.id);
      } else {
        if (this.mask.routes) {
          this.data.group.routes = [];
        } else {
          delete this.data.group.routes;
        }
      }
      if (this.gItem.waypoints.length !== 0) {
        this.data.group.waypoints = this.gItem.waypoints.map((w) => w.id);
      } else {
        if (this.mask.waypoints) {
          this.data.group.waypoints = [];
        } else {
          delete this.data.group.waypoints;
        }
      }
      if (this.gItem.regions.length !== 0) {
        this.data.group.regions = this.gItem.regions.map((r) => r.id);
      } else {
        if (this.mask.regions) {
          this.data.group.regions = [];
        } else {
          delete this.data.group.regions;
        }
      }
      if (this.gItem.charts.length !== 0) {
        this.data.group.charts = this.gItem.charts.map((c) => c.id);
      } else {
        delete this.data.group.charts;
      }
    }
    this.dialogRef.close({ save: save, group: this.data.group });
  }

  /**
   * Handle tab selection change.
   */
  onTabChange(id: string | null) {
    if (id === null) return;
    this.activeTabId.set(id);
    const idx = this.tabOrder.indexOf(id);
    this.selTab = idx === -1 ? 0 : idx;
  }

  /**
   * Sort the resource list
   * @param l Resource list
   * @returns Reference to sorted list
   */
  sortIt(l: RListEntry[]) {
    return l.sort((a, b) => {
      const x = a.name?.toLowerCase() ?? '';
      const y = b.name?.toLowerCase() ?? '';
      return x > y ? 1 : -1;
    });
  }

  /**
   * Display list of resources for selection to add
   */
  addResources() {
    let lTitle: string | undefined;
    let icon: AppIconDef | undefined;
    let rList: RListEntry[] = [];

    if (this.selTab === 1) {
      lTitle = 'Routes';
      icon = { svgIcon: 'route', class: 'ob' };
      const rteIds = new Set(this.gItem.routes.map((i) => i.id));
      rList = this.rtes.filter((i) => !rteIds.has(i.id));
    }
    if (this.selTab === 2) {
      lTitle = 'Waypoints';
      icon = { name: 'location_on' };
      const wptIds = new Set(this.gItem.waypoints.map((i) => i.id));
      rList = this.wpts.filter((i) => !wptIds.has(i.id));
    }
    if (this.selTab === 3) {
      lTitle = 'Regions';
      icon = { name: 'tab_unselected' };
      const regIds = new Set(this.gItem.regions.map((i) => i.id));
      rList = this.regions.filter((i) => !regIds.has(i.id));
    }
    if (this.selTab === 4) {
      lTitle = 'Charts';
      icon = { name: 'map' };
      const chtIds = new Set(this.gItem.charts.map((i) => i.id));
      rList = this.charts.filter((i) => !chtIds.has(i.id));
    }

    this.dialog
      .open(MultiSelectListDialog, {
        data: {
          title: `Select ${lTitle}`,
          icon: icon,
          items: this.sortIt(rList)
        }
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items: RListEntry[] | undefined) => {
        if (items) {
          if (this.selTab === 1) {
            this.gItem.routes = [...this.gItem.routes, ...items];
            this.sortIt(this.gItem.routes);
          }
          if (this.selTab === 2) {
            this.gItem.waypoints = [...this.gItem.waypoints, ...items];
            this.sortIt(this.gItem.waypoints);
          }
          if (this.selTab === 3) {
            this.gItem.regions = [...this.gItem.regions, ...items];
            this.sortIt(this.gItem.regions);
          }
          if (this.selTab === 4) {
            this.gItem.charts = [...this.gItem.charts, ...items];
            this.sortIt(this.gItem.charts);
          }
        }
      });
  }

  /**
   * Background load resource lists
   */
  bgLoadResources() {
    type NamedEntry = [string, { name?: string }, boolean?];
    (['routes', 'waypoints', 'regions', 'charts'] as SKResourceType[]).forEach(
      (g) => {
        this.skres.listFromServer<NamedEntry>(g).then((entries) => {
          const l: RListEntry[] = entries.map((i) => ({
            id: i[0],
            name: i[1].name ?? ''
          }));
          if (g === 'routes') this.rtes = l;
          else if (g === 'waypoints') this.wpts = l;
          else if (g === 'regions') this.regions = l;
          else if (g === 'charts') this.charts = l;
        });
      }
    );
  }
}
