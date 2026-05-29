import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ScrollingModule } from '@angular/cdk/scrolling';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardHeaderComponent,
  FbCardContentComponent,
  FbCardActionsComponent,
  FbCheckboxComponent,
  FbFormFieldComponent,
  FbIconComponent,
  FbMenuService,
  FbProgressBarComponent,
  FbSearchInputComponent,
  FbSelectComponent,
  FbSliderComponent,
  FbTooltipDirective,
  type FbMenuItem,
  type FbSelectOption
} from 'src/app/design-system/primitives';

import { AppFacade } from 'src/app/app.facade';
import {
  FBCustomResourceService,
  InfoLayerPropertiesDialog,
  SKInfoLayer,
  SKResourceService,
  WMSDialog,
  WMTSDialog
} from 'src/app/modules';
import { FBInfoLayer, FBInfoLayers } from 'src/app/types';
import { ResourceListBase } from '../resource-list-baseclass';
import type { DialogRef } from '@angular/cdk/dialog';
import { FbDialogService } from 'src/app/design-system/primitives';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { SignalKClient } from 'src/lib/signalk-client';
import {
  TimeDef,
  TimeDimension,
  getLayerNodeByName,
  wmsCapabilitiesInWorker,
  wmtsCapabilitiesInWorker
} from '../charts/maplib';

//** InfoLayer Resource List **
@Component({
  selector: 'infolayer-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './infolayerlist.html',
  styleUrls: ['../resourcelist.css'],
  imports: [
    FbButtonComponent,
    ScrollingModule,
    FbCardComponent,
    FbCardHeaderComponent,
    FbCardContentComponent,
    FbCardActionsComponent,
    FbCheckboxComponent,
    FbFormFieldComponent,
    FbIconComponent,
    FbProgressBarComponent,
    FbSearchInputComponent,
    FbSelectComponent,
    FbSliderComponent,
    FbTooltipDirective
  ]
})
export class InfoLayerListComponent extends ResourceListBase implements OnInit {
  closed = output<void>();
  paramChanged = output<{
    id: string;
    param: Record<string, any>;
  }>();

  filterList: FBInfoLayer[] = [];
  override filterText = '';
  override someSel = false;
  override allSel = false;
  protected override fullList: FBInfoLayers = [];

  private timeDim = new Map<string, TimeDef>();
  private fetchedUrls: string[] = [];

  private destroyRef = inject(DestroyRef);
  private menu = inject(FbMenuService);

  private readonly addLayerMenuItems: readonly FbMenuItem[] = [
    { id: 'wmts', label: 'WMTS' },
    { id: 'wms', label: 'WMS' }
  ];

  constructor(
    protected app: AppFacade,
    protected override skres: SKResourceService,
    protected skresOther: FBCustomResourceService,
    private dialog: FbDialogService,
    private signalk: SignalKClient
  ) {
    super('infolayers', skres);
  }

  protected openAddLayerMenu(event: MouseEvent) {
    const trigger = event.currentTarget as HTMLElement;
    this.menu
      .open(trigger, this.addLayerMenuItems)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        if (id === 'wmts' || id === 'wms') {
          this.addLayer(id);
        }
      });
  }

  ngOnInit() {
    this.initItems();
  }

  close() {
    this.closed.emit();
  }

  /**
   * @description Initialise the list.
   * @param silent Do not show progress bar when true.
   */
  async initItems(silent?: boolean) {
    if (this.app.sIsFetching()) {
      this.app.debug('** isFetching() ... exit.');
      return;
    }
    this.app.sIsFetching.set(!(silent ?? false));
    try {
      this.fullList = await this.skresOther.customListFromServer<FBInfoLayer>(
        'infolayers',
        'InfoLayer'
      );
      this.app.sIsFetching.set(false);
      this.doFilter();
      this.updateTimeDimensions();
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.app.parseHttpErrorResponse(err);
      this.fullList = [];
    }
  }

  /**
   * Update time dimension data for layer sources
   */
  private async updateTimeDimensions() {
    const capList = this.compileCapabilitiesReqList();
    let callCount = 0;

    capList.forEach(async (iLayers, url) => {
      try {
        if (!this.fetchedUrls.includes(url)) {
          this.fetchedUrls.push(url);
          const first = iLayers[0];
          const firstSourceType = first?.values?.sourceType
            ?.toString()
            .toLowerCase();
          if (firstSourceType === 'wms') {
            const capabilities = await wmsCapabilitiesInWorker(url);
            iLayers.forEach((il) => {
              const cl = getLayerNodeByName(il.name, capabilities.layers);
              if (cl?.time) {
                this.timeDim.set(il.id, cl.time);
              }
            });
          } else if (firstSourceType === 'wmts') {
            const capabilities = await wmtsCapabilitiesInWorker(url);
            capabilities.layers.forEach((cl) => {
              if (cl?.time) {
                this.timeDim.set(cl.id, cl.time);
              }
            });
          }
        }
      } catch (err) {
        this.app.debug(err);
      } finally {
        callCount++;
      }
      if (callCount === capList.size) {
        this.timeDim.forEach((v, k) => {
          const idx = this.fullList.findIndex((i) => i[0] === k);
          if (idx !== -1) {
            const entry = this.fullList[idx];
            if (entry) {
              entry[1].values.time = v;
            }
          }
        });
      }
    });
  }

  /**
   * Compile list of infolayers to collect time dimension data from WMS capabilities.
   * @abstract Currently only WMS with time.values array
   */
  private compileCapabilitiesReqList() {
    const capList = new Map<string, SKInfoLayer[]>();
    this.fullList.forEach((l) => {
      const values = l[1].values;
      const sourceType = (
        values?.sourceType as string | undefined
      )?.toLowerCase();
      if (sourceType === 'wms') {
        const url = values.url as string;
        const existing = capList.get(url);
        if (existing) {
          existing.push(l[1]);
        } else {
          capList.set(url, [l[1]]);
        }
      }
    });
    return capList;
  }

  /**
   * @description Toggle selections on / off
   * @param checked Determines if all checkboxes are checked or unchecked
   */
  protected override toggleAll(checked: boolean) {
    super.toggleAll(checked);
    this.skresOther.refreshInfoLayers();
  }

  /**
   * @description Handle layer entry check / uncheck
   * @param checked Value indicating entry is checked / unchecked
   * @param id layer identifier
   */
  protected itemSelect(checked: boolean, id: string) {
    const idx = this.toggleItem(checked, id);
    // update selections
    if (checked) {
      this.skres.selectionAdd(this.collection, id);
    } else {
      this.skres.selectionRemove(this.collection, id);
    }
    this.skresOther.refreshInfoLayers();
  }

  /**
   * @description Show layer properties
   * @param id layer identifier
   */
  protected itemProperties(id: string) {
    const ov = this.fullList.find((l: FBInfoLayer) => l[0] === id);
    if (ov) {
      this.dialog.open(InfoLayerPropertiesDialog, { data: ov[1] });
    }
  }

  /**
   * @description Delete layer
   * @param id layer identifier
   */
  protected itemDelete(id: string) {
    if (!id) {
      return;
    }
    this.app
      .showConfirm(
        'Do you want to delete this overlay?\n',
        'Delete Overlay:',
        'YES',
        'NO'
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (res) => {
        const result = res as { ok: boolean } | undefined;
        if (result?.ok) {
          try {
            await this.skres.deleteFromServer('infolayers', id);
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          } finally {
            this.skresOther.refreshInfoLayers();
            this.initItems(true);
          }
        }
      });
  }

  /**
   * @description Set layer refreshInterval property
   * @param id layer identifier
   */
  protected setRefresh(id: string, value: number) {
    const ov = this.fullList.find((l: FBInfoLayer) => l[0] === id);
    if (ov) {
      ov[1].values.refreshInterval = value;
      this.saveLayerToServer(id, ov[1]);
    }
  }

  protected formatDateTime(t: TimeDimension, e: number): string {
    let d: Date | undefined;
    if (t.interval) {
      const p = new Date(t.from).valueOf() + e * t.interval;
      d = new Date(p);
    } else if (t.values?.length) {
      const v = t.values[e];
      if (v !== undefined) {
        d = new Date(v);
      }
    }
    return d ? `${d.toLocaleDateString()} ${d.toLocaleTimeString()}` : '';
  }

  protected maxIndexFrominterval(t: TimeDimension) {
    if (!t.interval) {
      return 0;
    }
    return (new Date(t.to).valueOf() - new Date(t.from).valueOf()) / t.interval;
  }

  protected handleSliderChange(layer: FBInfoLayer, index: number) {
    const time = layer[1].values.time;
    if (time?.interval) {
      const p = new Date(time.from).valueOf() + index * time.interval;
      this.paramChanged.emit({
        id: layer[0],
        param: { TIME: new Date(p).toISOString() }
      });
    } else {
      this.paramChanged.emit({
        id: layer[0],
        param: { TIME: time?.values?.[index] }
      });
    }
  }

  /**
   * @description Set layer opacity property
   * @param id layer identifier
   */
  protected async setOpacity(id: string, value: number) {
    const ov = this.fullList.find((l: FBInfoLayer) => l[0] === id);
    if (ov) {
      ov[1].values.opacity = value;
      this.saveLayerToServer(id, ov[1]);
    }
  }

  /** Persist on server */
  private async saveLayerToServer(id: string, layer: SKInfoLayer) {
    try {
      await this.skres.putToServer('infolayers', id, layer);
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
    } finally {
      this.skresOther.refreshInfoLayers();
    }
  }

  protected refreshSelectOptions: readonly FbSelectOption<number>[] = [
    { id: 0, label: 'Never' },
    { id: 60000, label: '1 min' },
    { id: 60000 * 10, label: '10 min' },
    { id: 60000 * 30, label: '30 min' },
    { id: 60000 * 60, label: '1 hr' }
  ];

  protected opacitySelectOptions: readonly FbSelectOption<number>[] = [
    { id: 1, label: '100%' },
    { id: 0.9, label: '90%' },
    { id: 0.8, label: '80%' },
    { id: 0.7, label: '70%' },
    { id: 0.6, label: '60%' },
    { id: 0.5, label: '50%' },
    { id: 0.4, label: '40%' },
    { id: 0.3, label: '30%' },
    { id: 0.2, label: '20%' },
    { id: 0.1, label: '10%' }
  ];

  /** Add new layer */
  protected addLayer(type: 'wms' | 'wmts') {
    let dref: DialogRef<unknown> | undefined;

    if (type === 'wmts') {
      dref = this.dialog.open(WMTSDialog, {
        disableClose: true,
        data: { format: 'infolayer' }
      }) as DialogRef<unknown>;
    }
    if (type === 'wms') {
      dref = this.dialog.open(WMSDialog, {
        disableClose: true,
        data: { format: 'infolayer' }
      }) as DialogRef<unknown>;
    }
    if (!dref) {
      this.app.showAlert('Message', `Invalid source type (${type}) provided! `);
      return;
    }
    dref.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res) => {
      const sources = res as unknown[] | undefined;
      if (sources && sources.length !== 0) {
        // signalk-http post returns any; the array carries one request per source.
        const req = sources.map((cs) =>
          this.signalk.api.post(
            this.app.skApiVersion,
            `/resources/infolayers?provider=resources-provider`,
            cs
          )
        );

        const r = forkJoin(req).pipe(
          catchError((error: unknown) => of(error)),
          takeUntilDestroyed(this.destroyRef)
        );
        r.subscribe((res: unknown) => {
          const errObj = (res as { error?: HttpErrorResponse })?.error;
          if (errObj) {
            this.app.showAlert(
              'Add Overlay',
              `Error saving overlay source!\n(${errObj.status}: ${errObj.message})`
            );
          } else {
            this.app.showAlert(
              'Add Overlay',
              'Overlay sources added successfully.'
            );
            this.initItems();
          }
        });
      }
    });
  }
}
