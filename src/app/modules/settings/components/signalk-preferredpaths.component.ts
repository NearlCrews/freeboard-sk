import {
  Component,
  Input,
  output,
  ChangeDetectionStrategy,
  inject,
  OnInit
} from '@angular/core';

import {
  FbRadioComponent,
  FbRadioGroupComponent
} from 'src/app/design-system/primitives';

import { AppFacade } from 'src/app/app.facade';

interface PreferredPathEntry {
  name: string;
  choices: string[];
  available: string[];
  current: string;
}

interface PreferredPathsEmit {
  save: boolean;
  value: Record<string, string>;
}

@Component({
  selector: 'signalk-preferred-paths',
  imports: [FbRadioGroupComponent, FbRadioComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./signalk-preferredpaths.component.css'],
  template: `
    <fieldset>
      <legend style="font-size: var(--font-size-sm);">{{ title }}</legend>
      <div>
        @for (item of pathChoicesArray; track item[0]) {
          <div class="sk-details">
            <div class="title">
              <div>{{ item[1].name }}</div>
            </div>
            <fb-radio-group
              [value]="item[1].current"
              [ariaLabel]="item[1].name"
              (valueChange)="item[1].current = $event; save(true)"
            >
              @for (path of item[1].available; track path) {
                <fb-radio [value]="path">
                  {{ path.split('.').slice(-1) }}
                </fb-radio>
              }
            </fb-radio-group>
          </div>
        }
      </div>
    </fieldset>
  `
})
export class SignalKPreferredPathsComponent implements OnInit {
  @Input() title = '';
  readonly chosen = output<PreferredPathsEmit>();

  private pathChoices: {
    tws: PreferredPathEntry;
    twd: PreferredPathEntry;
    heading: PreferredPathEntry;
  } = {
    tws: {
      name: 'True Wind Speed',
      choices: [
        'environment.wind.speedTrue',
        'environment.wind.speedOverGround'
      ],
      available: [],
      current: ''
    },
    twd: {
      name: 'True Wind Direction',
      choices: [
        'environment.wind.directionTrue',
        'environment.wind.directionMagnetic',
        'environment.wind.angleTrueGround',
        'environment.wind.angleTrueWater'
      ],
      available: [],
      current: ''
    },
    heading: {
      name: 'Heading / COG',
      choices: [
        'navigation.courseOverGroundTrue',
        'navigation.courseOverGroundMagnetic',
        'navigation.headingTrue',
        'navigation.headingMagnetic'
      ],
      available: [],
      current: ''
    }
  };

  protected pathChoicesArray = Object.entries(this.pathChoices);

  public availPaths!: Map<string, unknown>;

  private app = inject(AppFacade);

  ngOnInit() {
    this.initEntries();
  }

  initEntries() {
    this.availPaths = new Map(
      Object.entries(this.app.data.vessels.prefAvailablePaths)
    );
    this.pathChoices.tws.current = this.app.config.units.preferredPaths.tws;
    this.pathChoices.twd.current = this.app.config.units.preferredPaths.twd;
    this.pathChoices.heading.current =
      this.app.config.units.preferredPaths.heading;

    const u = Object.entries(this.pathChoices);
    u.forEach((x) => {
      const i = x[1];
      i.choices.forEach((c) => {
        if (this.availPaths.has(c)) {
          i.available.push(c);
        }
      });
      if (i.available.length === 0) {
        const fallback = i.choices[0];
        if (typeof fallback === 'string') {
          i.available.push(fallback);
        }
      }
    });
  }

  save(keep: boolean) {
    const value: Record<string, string> = {};
    Object.entries(this.pathChoices).forEach((i) => {
      value[i[0]] = i[1].current;
    });
    this.chosen.emit({ save: keep, value });
  }
}
