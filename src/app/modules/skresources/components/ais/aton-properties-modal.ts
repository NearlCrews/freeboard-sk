import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FbBottomSheetRef,
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbIconComponent,
  FbToolbarComponent,
  FbTooltipDirective,
  FB_BOTTOM_SHEET_DATA
} from 'src/app/design-system/primitives';

import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'src/lib/signalk-client';
import type { SKAtoN } from 'src/app/modules/skresources/resource-classes';
import { SignalKDetailsComponent } from '../../components/signalk-details.component';

@Component({
  selector: 'ap-aton-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbCardComponent,
    FbCardContentComponent,
    FbIconComponent,
    FbToolbarComponent,
    FbTooltipDirective,
    SignalKDetailsComponent
  ],
  template: `
    <div class="_ap-aton">
      <fb-toolbar class="bg-transparent">
        <span fbToolbarLeading>
          <fb-icon [name]="data.icon" ariaLabel=""></fb-icon>
        </span>
        <span fbToolbarTitle>
          {{ data.title }}
        </span>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            ariaLabel="Close"
            (pressed)="modalRef.dismiss()"
            fbTooltip="Close"
            fbTooltipPosition="below"
          >
            <fb-icon name="keyboard_arrow_down" ariaLabel=""></fb-icon>
          </fb-button>
        </span>
      </fb-toolbar>

      <fb-card>
        <fb-card-content>
          <div class="flex flex-col">
            <div class="flex">
              <div class="key-label">Name:</div>
              <div class="flex-auto">{{ data.target.name }}</div>
            </div>
            <div class="flex">
              <div class="key-label">MMSI:</div>
              <div class="flex-auto">{{ data.target.mmsi }}</div>
            </div>
            <div class="flex">
              <div class="key-label">Type:</div>
              <div class="flex-auto">{{ data.target.type.name }}</div>
            </div>
            <fb-button variant="secondary" (pressed)="toggleProperties()">
              <span>Show {{ showProperties ? 'Less' : 'More' }}</span>
              <fb-icon
                [name]="
                  showProperties
                    ? 'keyboard_arrow_down'
                    : 'keyboard_arrow_right'
                "
                ariaLabel=""
              ></fb-icon>
            </fb-button>
            @if (showProperties) {
              <signalk-details-list
                [details]="properties"
              ></signalk-details-list>
            }
          </div>
        </fb-card-content>
      </fb-card>
    </div>
  `,
  styles: [
    `
      ._ap-aton {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-aton .key-label {
        width: 150px;
        font-weight: bold;
      }
    `
  ]
})
export class AtoNPropertiesModal implements OnInit {
  protected showProperties = true;
  protected properties: Record<string, string | number | null> = {};

  private app = inject(AppFacade);
  private sk = inject(SignalKClient);
  protected modalRef = inject(FbBottomSheetRef) as FbBottomSheetRef<
    unknown,
    AtoNPropertiesModal
  >;
  protected data = inject<{
    title: string;
    target: SKAtoN;
    id: string;
    icon: string;
    type: 'aton' | 'sar' | 'meteo';
  }>(FB_BOTTOM_SHEET_DATA);
  private destroyRef = inject(DestroyRef);

  constructor() {}

  ngOnInit() {
    this.getAtoNInfo();
  }

  toggleProperties() {
    this.showProperties = !this.showProperties;
  }

  // fetch object information
  private getAtoNInfo() {
    if (!this.data.id) {
      return;
    }
    const path = this.data.id.split('.').join('/');

    this.sk.api
      .get(path)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v: unknown) => {
        if (this.data.type === 'meteo') {
          this.properties = this.parseMeteo(v);
        } else {
          this.properties = this.parseAtoN(v);
        }
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseMeteo(data: any): Record<string, string | number | null> {
    const res: Record<string, string | number | null> = {};

    if (data?.navigation?.position) {
      res['navigation.position'] = data.navigation.position.value;
    }
    const bk = data?.environment?.observation ?? data?.environment;
    const pk = data?.environment?.observation
      ? 'environment.observation'
      : 'environment';
    if (bk) {
      this.processPathObject(res, bk, pk);
    }
    return res;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processPathObject(res: any, bk: any, pk: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.keys(bk).forEach((k: any) => {
      const pathRoot = `${pk}.${k}`;
      const g = bk[k];
      if (k === 'water' || (k === 'current' && pk === 'environment.water')) {
        this.processPathObject(res, g, pathRoot);
      } else if (g.meta) {
        res[pathRoot] = this.app.formatValueForDisplay(
          g.value,
          g.meta.units ? g.meta.units : '',
          k.toLowerCase().includes('level') ||
            k.toLowerCase().includes('height') // depth values
        );
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.entries(g).forEach((i: any) => {
          const key = `${pathRoot}.${i[0]}`;
          const precision = {
            precision: key === 'environment.outside.precipitationVolume' ? 5 : 1
          };
          const cat =
            i[0].toLowerCase().includes('level') ||
            i[0].toLowerCase().includes('height')
              ? { category: 'depth' }
              : {}; // depth values
          res[key] = this.app.formatValueForDisplay(
            i[1].value,
            i[1].meta && i[1].meta.units ? i[1].meta.units : '',
            Object.assign({}, cat, precision)
          );
        });
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseAtoN(data: any): Record<string, string | number | null> {
    const res: Record<string, string | number | null> = {};
    if (data?.navigation?.position) {
      res['navigation.position'] = data.navigation.position.value;
    }
    return Object.assign(res, this.data.target.properties);
  }
}
