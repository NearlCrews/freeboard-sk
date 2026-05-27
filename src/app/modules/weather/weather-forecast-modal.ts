/** Weather Forecast Component **
 ********************************/

import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Inject,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatBottomSheetRef,
  MatBottomSheetModule,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { FbButtonComponent } from 'src/app/design-system/primitives/button/button.component';
import { FbIconComponent } from 'src/app/design-system/primitives/icon/icon.component';
import {
  FbProgressBarComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'src/lib/signalk-client';
import type { SI_BASE_UNIT } from 'src/app/lib/convert';
import { Convert } from 'src/app/lib/convert';
import type { Position } from 'src/app/types';
import { CoordsPipe } from 'src/app/lib/pipes';

interface WeatherData {
  description?: string;
  time?: string;
  temperature?: string;
  temperatureMin?: string;
  temperatureMax?: string;
  dewPoint?: string;
  humidity?: string;
  pressure?: string;
  rain?: string;
  uvIndex?: string;
  clouds?: string;
  visibility?: string;
  wind?: {
    speed?: string;
    direction?: string;
    gust?: string;
  };
}

/********* WeatherForecastModal **********
	data: {
        title: "<string>" title text
    }
***********************************/
@Component({
  selector: 'weather-forecast-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    MatBottomSheetModule,
    FbButtonComponent,
    FbIconComponent,
    FbProgressBarComponent,
    FbToolbarComponent,
    CoordsPipe
  ],
  template: `
    <div class="_weather-forecast">
      <fb-toolbar class="weather-toolbar">
        <span fbToolbarLeading>
          <fb-icon name="air"></fb-icon>
        </span>
        <h2 fbToolbarTitle class="weather-toolbar-title">
          {{ data.title }}
        </h2>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            size="sm"
            ariaLabel="Close weather forecast"
            matTooltip="Close"
            matTooltipPosition="below"
            (pressed)="modalRef.dismiss()"
          >
            <fb-icon name="keyboard_arrow_down"></fb-icon>
          </fb-button>
        </span>
      </fb-toolbar>
      @if (isFetching) {
        <fb-progress-bar indeterminate></fb-progress-bar>
      } @else {
        @if (!forecasts || forecasts.length === 0) {
          <div class="weather-error">{{ errorText }}</div>
        } @else {
          <div class="weather-header">
            <div class="weather-header-spacer"></div>
            <div class="weather-position">
              <span class="weather-position-subtitle">{{ data.subTitle }}</span>
              <div class="weather-position-coords">
                <div class="weather-position-coord">
                  <span class="weather-position-label">Lat:</span>&nbsp;
                  <span
                    [innerText]="
                      this.data.position[1]
                        | coords: app.config.units.positionFormat : true
                    "
                  >
                  </span>
                  &nbsp;
                </div>
                <div class="weather-position-coord">
                  <span class="weather-position-label">Lon:</span>&nbsp;
                  <span
                    [innerText]="
                      this.data.position[0]
                        | coords: app.config.units.positionFormat : false
                    "
                  >
                  </span>
                </div>
              </div>
            </div>
            <div class="weather-header-spacer"></div>
          </div>

          <div class="meteo">
            <div class="meteo-row">
              <div class="meteo-row-label">
                <fb-icon name="schedule"></fb-icon>Time
              </div>
              <div class="meteo-row-units">&nbsp;</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.time }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label">
                <fb-icon name="device_thermostat"></fb-icon>Temp
              </div>
              <div class="meteo-row-units">{{ units.temp }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.temperature }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label">
                <fb-icon name="eco"></fb-icon>DewP
              </div>
              <div class="meteo-row-units">{{ units.temp }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.dewPoint }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label">
                <fb-icon name="air"></fb-icon>Speed
              </div>
              <div class="meteo-row-units">{{ units.speed }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.wind?.speed }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label">
                <fb-icon name="explore"></fb-icon>Dir
              </div>
              <div class="meteo-row-units">&nbsp;</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.wind?.direction }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label">
                <fb-icon name="air"></fb-icon>Gust
              </div>
              <div class="meteo-row-units">{{ units.speed }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.wind?.gust }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label">
                <fb-icon name="opacity"></fb-icon>Hum.
              </div>
              <div class="meteo-row-units">{{ units.humidity }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.humidity }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label">
                <fb-icon name="compress"></fb-icon>Bar.
              </div>
              <div class="meteo-row-units">{{ units.pressure }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.pressure }}</div>
              }
            </div>

            <div class="meteo-row">
              <div class="meteo-row-label">
                <fb-icon name="water_drop"></fb-icon>Rain
              </div>
              <div class="meteo-row-units">{{ units.precipitation }}</div>
              @for (f of forecasts; track f) {
                <div class="meteo-row-value">{{ f.rain }}</div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      ._weather-forecast {
        font-family: var(--font-family-sans);
        background: var(--ds-surface-1, var(--color-surface));
        color: var(--color-text);
      }

      .weather-toolbar {
        background-color: transparent;
      }
      .weather-toolbar-title {
        flex: 1 1 auto;
        padding-left: var(--space-xl);
        text-align: center;
        margin: 0;
        font-size: inherit;
        font-weight: var(--font-weight-medium);
      }

      /* WCAG 2.5.5 secondary touch-target floor (44px). The toolbar close
         button uses fb-button (variant=ghost, size=sm); pin the host to the
         44 px floor so a touch user still has a legal target. */
      ._weather-forecast fb-toolbar fb-button {
        min-width: var(--touch-secondary);
        min-height: var(--touch-secondary);
      }

      .weather-error {
        text-align: center;
        color: var(--color-text-muted);
        padding: var(--space-lg);
      }

      .weather-header {
        display: flex;
        flex-wrap: nowrap;
      }
      .weather-header-spacer {
        flex: 1;
      }
      .weather-position {
        width: 350px;
        text-align: center;
      }
      /* CSS keyword 'small' (~13.3px) sits between --font-size-xs (12px)
         and --font-size-sm (14px). Keeping the keyword preserves the
         original sizing until a between-step token lands. */
      .weather-position-subtitle {
        font-size: small;
        color: var(--color-text-muted);
      }
      .weather-position-coords {
        font-size: small;
        text-align: left;
        display: flex;
        flex-wrap: wrap;
      }
      .weather-position-coord {
        flex: 1;
      }
      .weather-position-label {
        font-weight: var(--font-weight-bold);
      }

      .meteo {
        overflow: auto;
        /* CSS keyword 'small' matches the position pane above. Token swap
           tracked alongside --weather-grid-font. */
        font-size: small;
      }
      .meteo-row {
        display: flex;
        text-wrap-mode: nowrap;
        /* CSS keyword 'gray' (oklch ~57%) is darker than --color-border
           (oklch 85% in light theme). Leaving literal to preserve the grid
           contrast until a --color-grid-rule token is added. */
        border-color: gray;
        border-style: solid;
        border-width: 0;
        font-weight: var(--font-weight-bold);
      }

      .meteo-row-label,
      .meteo-row-units {
        min-width: 65px;
        border-color: inherit;
        border-style: inherit;
        border-width: 0 0 1px 1px;
      }

      .meteo-row-units {
        min-width: 45px;
        max-width: 45px;
        text-align: center;
      }

      .meteo-row-value {
        border-width: 0 1px 1px;
        border-color: inherit;
        border-style: inherit;
        min-width: 50px;
        max-width: 50px;
        text-align: center;
      }

      .meteo-row:first-child div {
        /* Matches .meteo-row's gray border for grid contrast. See note
           above; switch when --color-grid-rule lands. */
        border-top: gray 1px solid;
      }

      /* Banded row highlight pinned to a pale-mint sRGB that reads as a
         meteorology grid, not a safety signal. Color and text deliberately
         stay literal: in night-red the row must still read as a recessive
         band, not be retinted to red. Candidate for a future
         --weather-row-band token if the spec adds one. */
      .meteo-row:nth-child(odd) div {
        background-color: rgb(209 243 209 / 60%);
        color: black;
      }
    `
  ]
})
export class WeatherForecastModal implements OnInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public forecasts: any[] = [];
  protected isFetching = false;
  protected errorText = 'No weather data found!';
  protected units!: {
    temp: string;
    speed: string;
    pressure: string;
    humidity: string;
    precipitation: string;
  };
  private maxForecasts = 12;

  private destroyRef = inject(DestroyRef);

  constructor(
    public app: AppFacade,
    private sk: SignalKClient,
    public modalRef: MatBottomSheetRef<WeatherForecastModal>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any
  ) {}

  ngOnInit() {
    this.getForecast(this.data.position);
    this.units = {
      temp: Convert.getSymbol(
        this.app.config.units?.temperature.toUpperCase() as SI_BASE_UNIT
      ),
      speed: this.app.formattedSpeedUnits,
      humidity: '%',
      pressure: 'Pa',
      precipitation: 'mm'
    };
  }

  private getForecast(pos: Position) {
    if (!this.app.featureFlags().weatherApi) {
      this.errorText =
        'Cannot retrieve forecasts as Weather API is not available!';
      return;
    }
    if (!this.data.position) {
      this.errorText =
        'Cannot retrieve forecasts as location has not been supplied!';
      return;
    }
    const path = `/weather/forecasts/point?lat=${pos[1]}&lon=${pos[0]}`;
    this.isFetching = true;
    this.sk.api
      .get(2, path)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (forecasts: any) => {
          this.isFetching = false;
          forecasts = forecasts.slice(0, this.maxForecasts);
          Object.values(forecasts)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .forEach((v: any) => {
              const forecastData: WeatherData = { wind: {} };
              forecastData.description = v.description ?? '';
              const d = new Date(v.date);
              forecastData.time = d
                ? `${d.getHours()}:${('00' + d.getMinutes()).slice(-2)}`
                : '';

              if (typeof v.outside?.temperature !== 'undefined') {
                forecastData.temperature = this.app.formatValueForDisplay(
                  v.outside.temperature,
                  'K',
                  { noSymbol: true }
                );
              } else {
                forecastData.temperature = '--';
              }
              if (typeof v.outside?.dewPointTemperature !== 'undefined') {
                forecastData.dewPoint = this.app.formatValueForDisplay(
                  v.outside?.dewPointTemperature,
                  'K',
                  { noSymbol: true }
                );
              } else {
                forecastData.dewPoint = '--';
              }

              forecastData.humidity =
                typeof v.outside?.absoluteHumidity !== 'undefined'
                  ? `${(v.outside?.absoluteHumidity * 100).toFixed(0)}`
                  : '--';
              forecastData.pressure =
                typeof v.outside?.pressure !== 'undefined'
                  ? `${Math.round(v.outside?.pressure)}`
                  : '--';

              forecastData.rain =
                typeof v.outside?.precipitationVolume !== 'undefined'
                  ? `${(v.outside?.precipitationVolume * 1000).toFixed(2)}`
                  : '--';

              if (typeof v.wind !== 'undefined') {
                const wind = forecastData.wind ?? (forecastData.wind = {});
                wind.speed =
                  typeof v.wind.speedTrue !== 'undefined'
                    ? `${this.app.formatSpeed(v.wind.speedTrue, true)}`
                    : '--';

                wind.gust =
                  typeof v.wind.gust !== 'undefined'
                    ? `${this.app.formatSpeed(v.wind.gust, true)}`
                    : '--';

                wind.direction =
                  typeof v.wind.directionTrue !== 'undefined'
                    ? `${this.toCardinal(Convert.radiansToDegrees(v.wind.directionTrue))}`
                    : '--';
              }
              this.forecasts.push(forecastData);
            });
        },
        () => {
          this.isFetching = false;
          this.errorText = 'Error retrieving weather data!';
        }
      );
  }

  toCardinal(value: number) {
    return value > 348.75 && value <= 11.25
      ? 'N'
      : value > 11.25 && value <= 22.5
        ? 'NNE'
        : value > 22.5 && value <= 67.5
          ? 'NE'
          : value > 67.5 && value <= 78.75
            ? 'ENE'
            : value > 78.75 && value <= 101.25
              ? 'E'
              : value > 101.25 && value <= 112.5
                ? 'ESE'
                : value > 112.5 && value <= 157.5
                  ? 'SE'
                  : value > 157.5 && value <= 168.75
                    ? 'SSE'
                    : value > 168.75 && value <= 191.25
                      ? 'S'
                      : value > 191.25 && value <= 202.5
                        ? 'SSW'
                        : value > 202.5 && value <= 245.5
                          ? 'SW'
                          : value > 245.5 && value <= 258.75
                            ? 'WSW'
                            : value > 258.75 && value <= 281.25
                              ? 'W'
                              : value > 281.25 && value <= 292.5
                                ? 'WNW'
                                : value > 292.5 && value <= 337.5
                                  ? 'NW'
                                  : value > 337.5 && value <= 348.75
                                    ? 'NNW'
                                    : 'N';
  }
}
