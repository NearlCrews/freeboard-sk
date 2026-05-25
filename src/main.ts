import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptorsFromDi())
  ]
}).catch((e) => console.log(e));
