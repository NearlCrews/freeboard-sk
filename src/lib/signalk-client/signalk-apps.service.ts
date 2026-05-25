// Vendored from signalk-client-angular ^2.1.0 (Apache 2.0, AdrianP).
// Pure ESM, named exports, tree-shakable.
//
// Loose response types preserved during inline. Phase 6 (TS strict ratchet)
// will tighten the public surface. See MODERNIZATION_ROADMAP.md.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SignalKApps {
  private readonly http = inject(HttpClient);

  // Apps API endpoint path.
  endpoint = '';

  // Return list of installed apps.
  list(): Observable<any> {
    const ep = this.endpoint.includes('webapps')
      ? this.endpoint
      : `${this.endpoint}list`;
    return this.http.get(ep);
  }
}
