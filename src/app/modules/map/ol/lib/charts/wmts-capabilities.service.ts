import { Injectable } from '@angular/core';

import WMTSCapabilities from 'ol/format/WMTSCapabilities';

@Injectable({
  providedIn: 'root'
})
export class WmtsCapabilitiesService {
  private cache = new Map<string, Promise<unknown>>();

  public getCapabilities(hostUrl: string): Promise<unknown> {
    const existing = this.cache.get(hostUrl);
    if (existing) {
      return existing;
    }
    // concurrent layers share one in-flight fetch
    const pending = this.fetchCapabilities(hostUrl).catch((err) => {
      // delete on error so the next caller retries
      this.cache.delete(hostUrl);
      throw err;
    });
    this.cache.set(hostUrl, pending);
    return pending;
  }

  private async fetchCapabilities(hostUrl: string): Promise<unknown> {
    const abortCtrl = new AbortController();
    const abortTimer = setTimeout(() => abortCtrl.abort(), 5000);
    try {
      const r = await fetch(`${hostUrl}?request=GetCapabilities&service=wmts`, {
        signal: abortCtrl.signal
      });
      clearTimeout(abortTimer);
      const res = await r.text();
      const wmts = new WMTSCapabilities();
      return wmts.read(res);
    } catch (err) {
      clearTimeout(abortTimer);
      const message =
        err instanceof Error ? err.message : 'Unable to retrieve capabilities!';
      throw new Error(message);
    }
  }
}
