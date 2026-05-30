import { inject, Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { SK2GPX } from './sk2gpx';
import { SKTrack } from 'src/app/modules';
import { SignalKClient } from 'src/lib/signalk-client';
import type { Position } from 'src/app/types';

interface ResourceRecordInput {
  feature: { id?: string; properties?: Record<string, unknown> };
  name?: string;
}

interface ResourceRecord {
  feature: { id: string; properties?: Record<string, unknown> };
  name?: string;
}

type ResourceTuple = [string, ResourceRecordInput, boolean?];

interface SaveSelections {
  rte: { selected: boolean[] };
  wpt: { selected: boolean[] };
  trk: { selected: boolean[] };
}

interface SaveResData {
  routes: ResourceRecord[];
  waypoints: ResourceRecord[];
  tracks: unknown[];
}

@Injectable({ providedIn: 'root' })
export class GPXSaveFacade {
  private resultSource: Subject<number>;
  public result$: Observable<number>;
  private sk2gpx: SK2GPX | null = null;
  public hasFSA: boolean;

  private signalk = inject(SignalKClient);

  constructor() {
    this.resultSource = new Subject<number>();
    this.result$ = this.resultSource.asObservable();
    this.hasFSA = 'showOpenFilePicker' in window;
  }

  clear() {
    this.sk2gpx = null;
  }

  prepData(data: {
    routes: ResourceTuple[];
    waypoints: ResourceTuple[];
    tracks: unknown[];
  }) {
    const resData: {
      routes: ResourceRecord[];
      waypoints: ResourceRecord[];
      tracks: unknown[];
    } = {
      routes: [],
      waypoints: [],
      tracks: []
    };

    resData.routes = data.routes.map((r) => {
      const rte = r[1];
      rte.feature.id = r[0];
      return rte as ResourceRecord;
    });
    let idx = 1;
    resData.waypoints = data.waypoints.map((w) => {
      const wpt = w[1];
      wpt.feature.id = w[0];
      wpt.name = wpt.name ?? `Wpt: ${idx}`;
      idx++;
      return wpt as ResourceRecord;
    });
    resData.tracks = data.tracks;
    return resData;
  }

  saveToFile(res: SaveResData, selections: SaveSelections) {
    const sk2gpx = new SK2GPX();
    this.sk2gpx = sk2gpx;

    const skroutes: Record<string, ResourceRecord> = {};
    const skwaypoints: Record<string, ResourceRecord> = {};
    const sktracks: Record<string, SKTrack> = {};

    for (let i = 0; i < selections.rte.selected.length; i++) {
      if (selections.rte.selected[i]) {
        const route = res.routes[i];
        if (route) {
          skroutes[route.feature.id] = route;
        }
      }
    }
    sk2gpx.setRoutes(skroutes);

    for (let i = 0; i < selections.wpt.selected.length; i++) {
      if (selections.wpt.selected[i]) {
        const wpt = res.waypoints[i];
        if (wpt) {
          skwaypoints[wpt.feature.id] = wpt;
        }
      }
    }
    sk2gpx.setWaypoints(skwaypoints);

    for (let i = 0; i < selections.trk.selected.length; i++) {
      if (selections.trk.selected[i]) {
        const uuid = this.signalk.uuid;
        const trk = new SKTrack();
        trk.feature.id = uuid;
        const props: Record<string, unknown> = trk.feature.properties ?? {};
        props['name'] = `Vessel trail: ${Date().toString()}`;
        trk.feature.properties = props;
        trk.feature.geometry.coordinates.push(res.tracks[i] as Position[]);
        sktracks[uuid] = trk;
      }
    }
    sk2gpx.setTracks(sktracks);

    if (this.hasFSA) {
      this.fsaSaveFile();
    } else {
      this.legacySaveToFile();
    }
  }

  legacySaveToFile() {
    if (!this.sk2gpx) {
      this.resultSource.next(1);
      return;
    }
    const file = new Blob([this.sk2gpx.toXML()], { type: 'text/xml' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = 'fb_export.gpx';
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
    this.resultSource.next(-1);
  }

  fsaSaveFile() {
    const sk2gpx = this.sk2gpx;
    if (!sk2gpx) {
      this.resultSource.next(1);
      return;
    }
    const showSaveFilePicker = (
      window as unknown as {
        showSaveFilePicker: (
          opts: unknown
        ) => Promise<FileSystemFileHandleLike>;
      }
    ).showSaveFilePicker;
    showSaveFilePicker({
      types: [
        {
          description: 'GPX file',
          accept: { 'text/xml': ['.gpx'] }
        }
      ]
    })
      .then((h: FileSystemFileHandleLike) => {
        h.createWritable()
          .then((writable: FileSystemWritableLike) => {
            const blob = new Blob([sk2gpx.toXML()]);
            writable.write(blob).then(() => {
              writable.close();
              this.resultSource.next(0);
            });
          })
          .catch((err: Error) => {
            console.warn(err);
            this.resultSource.next(1);
          });
      })
      .catch(() => {
        this.resultSource.next(-1);
      });
  }
}

interface FileSystemWritableLike {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
}

interface FileSystemFileHandleLike {
  createWritable: () => Promise<FileSystemWritableLike>;
}
