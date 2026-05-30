import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay } from 'rxjs';

/**
 * Tiny in-house SVG registry used by fb-icon's svgName input. Consumers
 * register a logical name and a URL; getNamedSvgIcon fetches once, parses
 * to an SVGElement, caches the parsed node, and replays it to every
 * subscriber so repeated icon renders share a single network round-trip.
 */
@Injectable({ providedIn: 'root' })
export class FbIconRegistry {
  private readonly http = inject(HttpClient);
  private readonly urls = new Map<string, string>();
  private readonly cache = new Map<string, Observable<SVGElement>>();

  register(name: string, url: string): void {
    this.urls.set(name, url);
  }

  getNamedSvgIcon(name: string): Observable<SVGElement> {
    const cached = this.cache.get(name);
    if (cached) return cached;
    const url = this.urls.get(name);
    if (!url) return of(this.createMissingPlaceholder());
    const obs = this.http.get(url, { responseType: 'text' }).pipe(
      map((text) => this.parse(text)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.cache.set(name, obs);
    return obs;
  }

  private parse(text: string): SVGElement {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');
    const svg = doc.documentElement;
    if (svg.nodeName.toLowerCase() !== 'svg') {
      return this.createMissingPlaceholder();
    }
    return svg as unknown as SVGElement;
  }

  private createMissingPlaceholder(): SVGElement {
    return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  }
}
