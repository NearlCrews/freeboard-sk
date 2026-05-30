import type { OnInit, OnDestroy } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject
} from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  FbButtonComponent,
  FbCheckboxComponent,
  FbDialogContentDirective,
  FbDividerComponent,
  FbExpansionPanelComponent,
  FbExpansionPanelDescriptionDirective,
  FbExpansionPanelTitleDirective,
  FbIconComponent,
  FbProgressBarComponent,
  FbToolbarComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';

import { AppFacade } from 'src/app/app.facade';
import { SettingsStore } from 'src/app/stores';
import { SignalKClient } from 'src/lib/signalk-client';
import type { SKTrack } from 'src/app/modules';
import { SKResourceService } from 'src/app/modules';
import type {
  GPXRoute,
  GPXWaypoint,
  GPXTrack,
  GPXTrackSegment
} from './gpxlib';
import { GPX } from './gpxlib';
import type { HttpErrorResponse } from '@angular/common/http';
import type { ErrorList } from 'src/app/types';

interface GPXDataSummary {
  name: string;
  routes: { name: string; description: string; wptcount: number }[];
  waypoints: { name: string; description: string }[];
  tracks: { name: string; description: string }[];
}

@Component({
  selector: 'gpxload-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbCheckboxComponent,
    FbDialogContentDirective,
    FbDividerComponent,
    FbExpansionPanelComponent,
    FbExpansionPanelDescriptionDirective,
    FbExpansionPanelTitleDirective,
    FbIconComponent,
    FbProgressBarComponent,
    FbToolbarComponent,
    FbTooltipDirective
  ],
  templateUrl: './gpxload-dialog.html',
  styleUrls: ['./gpxload-dialog.css']
})
export class GPXImportDialog implements OnInit, OnDestroy {
  public gpxData: GPXDataSummary = {
    name: '',
    routes: [],
    waypoints: [],
    tracks: []
  };

  public selRoutes: boolean[] = [];
  public selWaypoints: boolean[] = [];
  public selTracks: boolean[] = [];

  public display = {
    notValid: false,
    allRoutesChecked: false,
    allWaypointsChecked: false,
    allTracksChecked: false,
    someWptChecked: false,
    someRteChecked: false,
    someTrkChecked: false,
    loadRoutesOK: false,
    loadWaypointsOK: false,
    loadTracksOK: false,
    routeViewer: false,
    selCount: { routes: 0, waypoints: 0, tracks: 0 },
    expand: { routes: false, waypoints: false, tracks: false }
  };

  private errorCount = 0;
  private subCount = 0;
  private gpx: GPX | null = null;

  protected app = inject(AppFacade);
  private settings = inject(SettingsStore);
  protected dialogRef = inject(DialogRef<unknown, GPXImportDialog>);
  private skres = inject(SKResourceService);
  private signalk = inject(SignalKClient);

  constructor(
    @Inject(DIALOG_DATA)
    public data: { fileData: string; fileName?: string }
  ) {}

  ngOnInit() {
    this.parseGPXData(this.data.fileData);
  }

  ngOnDestroy() {
    this.clear();
  }

  load() {
    this.uploadToServer({
      rte: { selected: this.selRoutes },
      wpt: { selected: this.selWaypoints },
      trk: { selected: this.selTracks }
    });
  }

  async parseGPXData(data: string) {
    this.display.allRoutesChecked = false;
    this.display.loadRoutesOK = false;
    this.selRoutes = [];
    this.display.allWaypointsChecked = false;
    this.display.loadWaypointsOK = false;
    this.selWaypoints = [];
    this.display.allTracksChecked = false;
    this.display.loadTracksOK = false;
    this.selTracks = [];
    this.display.selCount = { routes: 0, waypoints: 0, tracks: 0 };
    this.display.expand = { routes: false, waypoints: false, tracks: false };
    this.display.notValid = false;

    const parsed = await this.parseFileData(data);
    if (!parsed) {
      console.warn(
        'Selected file does not contain GPX data or\ndoes not correctly implement namespaced <extensions> attributes',
        'Invalid GPX Data:'
      );
      this.display.notValid = true;
      return;
    }
    this.gpxData = parsed;

    this.gpxData.routes.forEach(() => {
      this.selRoutes.push(false);
    });
    if (this.selRoutes.length === 1) {
      this.selRoutes[0] = true;
      this.display.allRoutesChecked = true;
      this.display.expand.routes = true;
      this.display.loadRoutesOK = true;
      this.display.selCount.routes = 1;
    }

    this.gpxData.waypoints.forEach(() => {
      this.selWaypoints.push(false);
    });
    if (this.selWaypoints.length === 1) {
      this.selWaypoints[0] = true;
      this.display.allWaypointsChecked = true;
      this.display.expand.waypoints = true;
      this.display.loadWaypointsOK = true;
      this.display.selCount.waypoints = 1;
    }

    this.gpxData.tracks.forEach(() => {
      this.selTracks.push(false);
    });
    if (this.selTracks.length === 1) {
      this.selTracks[0] = true;
      this.display.allTracksChecked = true;
      this.display.expand.tracks = true;
      this.display.loadTracksOK = true;
      this.display.selCount.tracks = 1;
    }
  }

  /** idx=-1 -> check all */
  checkRte(checked: boolean, idx = -1) {
    let selcount = 0;
    if (idx !== -1) {
      this.selRoutes[idx] = checked;
      this.display.loadRoutesOK = checked;
      for (const c of this.selRoutes) {
        if (c) {
          selcount++;
        }
      }
      this.display.loadRoutesOK = selcount !== 0 ? true : false;
      this.display.selCount.routes = selcount;
      this.display.allRoutesChecked = selcount === this.selRoutes.length;
    } else {
      for (let i = 0; i < this.selRoutes.length; i++) {
        this.selRoutes[i] = checked;
        this.display.loadRoutesOK = checked;
        this.display.allRoutesChecked = checked;
      }
      this.display.selCount.routes = checked ? this.selRoutes.length : 0;
    }
    this.display.someRteChecked =
      this.display.allRoutesChecked || selcount === 0 ? false : true;
  }

  /** idx=-1 -> check all */
  checkWpt(checked: boolean, idx = -1) {
    let selcount = 0;
    if (idx !== -1) {
      this.selWaypoints[idx] = checked;
      this.display.loadWaypointsOK = checked;
      for (const c of this.selWaypoints) {
        if (c) {
          selcount++;
        }
      }
      this.display.loadWaypointsOK = selcount !== 0 ? true : false;
      this.display.selCount.waypoints = selcount;
      this.display.allWaypointsChecked = selcount === this.selWaypoints.length;
    } else {
      for (let i = 0; i < this.selWaypoints.length; i++) {
        this.selWaypoints[i] = checked;
        this.display.loadWaypointsOK = checked;
        this.display.allWaypointsChecked = checked;
      }
      this.display.selCount.waypoints = checked ? this.selWaypoints.length : 0;
    }
    this.display.someWptChecked =
      this.display.allWaypointsChecked || selcount === 0 ? false : true;
  }

  /** idx=-1 -> check all */
  checkTrk(checked: boolean, idx = -1) {
    let selcount = 0;
    if (idx !== -1) {
      this.selTracks[idx] = checked;
      this.display.loadTracksOK = checked;
      for (const c of this.selTracks) {
        if (c) {
          selcount++;
        }
      }
      this.display.loadTracksOK = selcount !== 0 ? true : false;
      this.display.selCount.tracks = selcount;
      this.display.allTracksChecked = selcount === this.selTracks.length;
    } else {
      for (let i = 0; i < this.selTracks.length; i++) {
        this.selTracks[i] = checked;
        this.display.loadTracksOK = checked;
        this.display.allTracksChecked = checked;
      }
      this.display.selCount.tracks = checked ? this.selTracks.length : 0;
    }
    this.display.someTrkChecked =
      this.display.allTracksChecked || selcount === 0 ? false : true;
  }

  public clear() {
    this.gpx = null;
  }

  public async parseFileData(data: string): Promise<GPXDataSummary | null> {
    const gpxData: GPXDataSummary = {
      name: '',
      routes: [],
      waypoints: [],
      tracks: []
    };
    const gpx = new GPX();
    this.gpx = gpx;

    this.settings.sIsFetching.set(true);
    if (!(await gpx.parse(data))) {
      this.settings.sIsFetching.set(false);
      return null;
    }

    let idx = 1;
    gpx.rte.forEach((r) => {
      gpxData.routes.push({
        name: r.name && r.name !== '' ? r.name : `Rte: ${idx}`,
        description: r.desc ? r.desc : r.cmt ? r.cmt : '',
        wptcount: r.rtept.length
      });
      idx++;
    });
    idx = 1;
    gpx.wpt.forEach((w) => {
      gpxData.waypoints.push({
        name: w.name ? w.name : `Wpt: ${idx}`,
        description: w.desc ? w.desc : w.cmt ? w.cmt : ''
      });
      idx++;
    });
    idx = 1;
    gpx.trk.forEach((t) => {
      gpxData.tracks.push({
        name: t.name ? t.name : `Trk: ${idx}`,
        description: t.desc ? t.desc : t.cmt ? t.cmt : ''
      });
      idx++;
    });
    this.settings.sIsFetching.set(false);
    return gpxData;
  }

  public async uploadToServer(res: {
    rte: { selected: boolean[] };
    wpt: { selected: boolean[] };
    trk: { selected: boolean[] };
  }) {
    if (!this.gpx) {
      return;
    }
    const gpx = this.gpx;
    this.settings.sIsFetching.set(true);
    this.errorCount = 0;
    this.subCount = 0;

    for (let i = 0; i < res.rte.selected.length; i++) {
      if (res.rte.selected[i]) {
        const r = gpx.rte[i];
        if (r) {
          this.transformRoute(r);
        }
      }
    }

    for (let i = 0; i < res.wpt.selected.length; i++) {
      if (res.wpt.selected[i]) {
        const w = gpx.wpt[i];
        if (w) {
          this.transformWaypoint(w);
        }
      }
    }

    const trkIds: string[] = [];
    for (let i = 0; i < res.trk.selected.length; i++) {
      if (res.trk.selected[i]) {
        const gpxTrk = gpx.trk[i];
        if (!gpxTrk) {
          continue;
        }
        const trk = this.transformTrack(gpxTrk);
        this.subCount++;
        try {
          const postRes = await this.skres.postToServer(
            'tracks',
            trk as unknown as SKTrack
          );
          this.subCount--;
          if (
            postRes.statusCode !== undefined &&
            Math.floor(postRes.statusCode / 100) === 2
          ) {
            if (postRes.id) {
              trkIds.push(postRes.id);
            }
            this.app.debug('SUCCESS: Track added.');
          } else {
            this.errorCount++;
          }
          this.checkComplete();
        } catch (err) {
          this.errorCount++;
          this.subCount--;
          this.logError(err as HttpErrorResponse);
          this.checkComplete();
        }
      }
    }
    if (trkIds.length !== 0) {
      this.skres.trackAddFromServer(trkIds);
    }
  }

  private errorList: ErrorList = [];

  private logError(err: HttpErrorResponse) {
    const msg = err.error ? err.error.message : err.message;
    this.errorList.push({ status: err.status, message: msg });
  }

  private checkComplete() {
    if (this.subCount === 0) {
      this.settings.sIsFetching.set(false);
      this.app.saveConfig();
      this.dialogRef.close({
        errCount: this.errorCount,
        errList: this.errorList
      });
      this.app.debug(`GPXLoad: complete: ${this.errorCount}`);
    }
  }

  private transformRoute(r: GPXRoute) {
    const skObj = this.skres.buildRoute(
      r.rtept.map((pt): [number, number] => [pt.lon, pt.lat])
    );
    const rte = skObj[1];

    rte.name = r.name ?? '';
    rte.description = r.desc ?? '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props: Record<string, any> = rte.feature.properties ?? {};
    rte.feature.properties = props;
    if (r.cmt) {
      props['cmt'] = r.cmt;
    }
    if (r.src) {
      props['src'] = r.src;
    }
    if (r.number) {
      props['number'] = r.number;
    }
    if (r.type) {
      props['type'] = r.type;
    }
    props['coordinatesMeta'] = r.rtept.map((pt) => {
      const ptMeta: Record<string, string> = { name: pt.name ?? '' };
      if (pt.cmt) {
        ptMeta['description'] = pt.cmt;
      }
      return ptMeta;
    });

    this.subCount++;
    this.signalk.api
      .put(this.app.skApiVersion, `/resources/routes/${skObj[0]}`, skObj[1])
      .subscribe({
        next: (r: { statusCode?: number }) => {
          this.subCount--;
          if (
            typeof r.statusCode === 'number' &&
            Math.floor(r.statusCode / 100) === 2
          ) {
            this.app.debug('SUCCESS: Route added.');
            this.app.config.selections.routes.push(skObj[0]);
          } else {
            this.errorCount++;
          }
          this.checkComplete();
        },
        error: (err: HttpErrorResponse) => {
          this.errorCount++;
          this.subCount--;
          this.logError(err);
          this.checkComplete();
        }
      });
  }

  private transformWaypoint(pt: GPXWaypoint) {
    const wptObj = this.skres.buildWaypoint([pt.lon, pt.lat]);
    const wpt = wptObj[1];
    if (pt.ele) {
      wpt.feature.geometry.coordinates.push(pt.ele);
    }
    if (pt.name && pt.name.length !== 0) {
      wpt.name = pt.name;
    }
    if (pt.desc && pt.desc.length !== 0) {
      wpt.description = pt.desc;
    }
    if (pt.type) {
      wpt.type = pt.type;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props: Record<string, any> = wpt.feature.properties ?? {};
    wpt.feature.properties = props;
    if (pt.cmt) {
      props['cmt'] = pt.cmt;
    }
    if (pt.src) {
      props['src'] = pt.src;
    }
    if (pt.sym) {
      props['sym'] = pt.sym;
    }

    this.subCount++;
    this.signalk.api
      .put(
        this.app.skApiVersion,
        `/resources/waypoints/${wptObj[0]}`,
        wptObj[1]
      )
      .subscribe({
        next: (r: { statusCode?: number }) => {
          this.subCount--;
          if (
            typeof r.statusCode === 'number' &&
            Math.floor(r.statusCode / 100) === 2
          ) {
            this.app.debug('SUCCESS: Waypoint added.');
            this.app.config.selections.waypoints.push(wptObj[0]);
          } else {
            this.errorCount++;
          }
          this.checkComplete();
        },
        error: (err: HttpErrorResponse) => {
          this.errorCount++;
          this.subCount--;
          this.logError(err);
          this.checkComplete();
        }
      });
  }

  private transformTrack(gpxtrk: GPXTrack) {
    const trk = {
      feature: {
        type: 'Feature',
        geometry: { type: 'MultiLineString', coordinates: [] as number[][][] },
        properties: {} as Record<string, unknown>,
        id: ''
      }
    };
    if (gpxtrk.trkseg) {
      gpxtrk.trkseg.forEach((tseg: GPXTrackSegment) => {
        const line: number[][] = [];
        tseg.trkpt.forEach((pt: GPXWaypoint) => {
          line.push([pt.lon, pt.lat]);
        });
        trk.feature.geometry.coordinates.push(line);
      });
    }
    if (gpxtrk.name && gpxtrk.name.length !== 0) {
      trk.feature.properties['name'] = gpxtrk.name;
    } else {
      trk.feature.properties['name'] = `gpxtrk #${Math.random()
        .toString()
        .slice(-5)}`;
    }
    if (gpxtrk.desc && gpxtrk.desc.length !== 0) {
      trk.feature.properties['description'] = gpxtrk.desc;
    }
    if (gpxtrk.cmt) {
      trk.feature.properties['cmt'] = gpxtrk.cmt;
    }
    if (gpxtrk.src) {
      trk.feature.properties['src'] = gpxtrk.src;
    }
    if (gpxtrk.type) {
      trk.feature.properties['type'] = gpxtrk.type;
    }
    return trk;
  }
}
