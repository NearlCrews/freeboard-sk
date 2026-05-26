/** Settings abstraction Facade
 * ************************************/
import { inject, Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { SK2GPX } from './sk2gpx';
import { SKTrack } from 'src/app/modules';
import { SignalKClient } from 'src/lib/signalk-client';

@Injectable({ providedIn: 'root' })
export class GPXSaveFacade {
  // **************** ATTRIBUTES ***************************
  private resultSource: Subject<number>;
  public result$: Observable<number>;
  private sk2gpx: SK2GPX | null = null;
  public hasFSA: boolean;

  // *******************************************************

  private signalk = inject(SignalKClient);

  constructor() {
    this.resultSource = new Subject<number>();
    this.result$ = this.resultSource.asObservable();
    this.hasFSA = 'showOpenFilePicker' in window;
  }

  // ** delete GPX object data **
  clear() {
    this.sk2gpx = null;
  }

  // ** prepare resource data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prepData(data: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resData: { routes: any[]; waypoints: any[]; tracks: any[] } = {
      routes: [],
      waypoints: [],
      tracks: []
    };

    let idx = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resData.routes = data.routes.map((r: any[]) => {
      const rte = r[1];
      rte.feature.id = r[0];
      return rte;
    });
    idx = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resData.waypoints = data.waypoints.map((w: any[]) => {
      const wpt = w[1];
      wpt.feature.id = w[0];
      wpt.name = wpt.name ?? `Wpt: ${idx}`;
      idx++;
      return wpt;
    });
    resData.tracks = data.tracks;
    return resData;
  }

  // ** save selected resources to GPX file **
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveToFile(res: any, selections: any) {
    const sk2gpx = new SK2GPX();
    this.sk2gpx = sk2gpx;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skroutes: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skwaypoints: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sktracks: Record<string, any> = {};

    for (let i = 0; i < selections.rte.selected.length; i++) {
      if (selections.rte.selected[i]) {
        skroutes[res.routes[i].feature.id] = res.routes[i];
      }
    }
    sk2gpx.setRoutes(skroutes);

    for (let i = 0; i < selections.wpt.selected.length; i++) {
      if (selections.wpt.selected[i]) {
        skwaypoints[res.waypoints[i].feature.id] = res.waypoints[i];
      }
    }
    sk2gpx.setWaypoints(skwaypoints);

    for (let i = 0; i < selections.trk.selected.length; i++) {
      if (selections.trk.selected[i]) {
        const uuid = this.signalk.uuid;
        const trk = new SKTrack();
        trk.feature.id = uuid;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const props: Record<string, any> = trk.feature.properties ?? {};
        props['name'] = `Vessel trail: ${Date().toString()}`;
        trk.feature.properties = props;
        trk.feature.geometry.coordinates.push(res.tracks[i]);
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

  // Using legacy download
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

  // Using fileSystem Access API (https)
  fsaSaveFile() {
    const sk2gpx = this.sk2gpx;
    if (!sk2gpx) {
      this.resultSource.next(1);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)
      .showSaveFilePicker({
        types: [
          {
            description: 'GPX file',
            accept: { 'text/xml': ['.gpx'] }
          }
        ]
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((h: any) => {
        h.createWritable()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((writable: any) => {
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
