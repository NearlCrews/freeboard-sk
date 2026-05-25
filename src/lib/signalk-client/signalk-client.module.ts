// Vendored from signalk-client-angular ^2.1.0 (Apache 2.0, AdrianP).
// Pure ESM, named exports, tree-shakable.
//
// The original package exported NgModule + provideHttpClient(...) for legacy
// NgModule-based bootstraps. freeboard-sk uses standalone bootstrap with
// provideHttpClient() configured in main.ts, so the module shell is kept only
// for public-API parity and is not currently imported by the app.

import { NgModule } from '@angular/core';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';

@NgModule({
  declarations: [],
  exports: [],
  imports: [],
  providers: [provideHttpClient(withInterceptorsFromDi())]
})
export class SignalKClientModule {}
