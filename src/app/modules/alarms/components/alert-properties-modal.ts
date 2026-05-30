import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject
} from '@angular/core';
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

import { SignalKDetailsComponent } from '../../skresources';
import type { AlertData } from './alert.component';
import { NotificationManager } from '../notification-manager';
import { alertSeverityClass } from './alert-severity';

@Component({
  selector: 'ap-alert-modal',
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
    <div class="_ap-alert">
      <fb-toolbar class="bg-transparent">
        <span fbToolbarLeading>
          <fb-icon
            [class]="data.alert.icon.class"
            [svgName]="data.alert.icon.svgIcon ?? ''"
            [name]="data.alert.icon.name ?? ''"
            ariaLabel=""
          ></fb-icon>
        </span>
        <h2
          fbToolbarTitle
          style="margin: 0; font-size: inherit; font-weight: inherit;"
        >
          Alert Information
        </h2>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            size="sm"
            ariaLabel="Close alert information"
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
            @if (data.alert.canAcknowledge && !data.alert.acknowledged) {
              <div class="flex">
                <div class="flex-auto">
                  <fb-button
                    variant="danger"
                    (pressed)="notiMgr.acknowledge(data.alert.path)"
                  >
                    <fb-icon name="check" ariaLabel=""></fb-icon> Acknowledge
                  </fb-button>
                </div>
              </div>
            }
            <div class="flex">
              <div class="key-label">Message:</div>
              <div class="flex-auto">{{ data.alert.message }}</div>
            </div>
            <div class="flex">
              <div class="key-label">Type:</div>
              <div class="flex-auto">{{ data.alert.type }}</div>
            </div>
            <div class="flex">
              <div class="key-label">Priority:</div>
              <div class="flex-auto" [class]="severityClass()">
                {{ data.alert.priority }}
              </div>
            </div>
            <div class="flex">
              <div class="key-label">Raised at:</div>
              <div class="flex-auto">{{ raisedAt }}</div>
            </div>
            @if (hasProperties) {
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
            }
          </div>
        </fb-card-content>
      </fb-card>
    </div>
  `,
  styles: [
    `
      ._ap-alert {
        font-family: var(--font-family-sans);
        min-width: 300px;
      }
      ._ap-alert .key-label {
        width: 150px;
        font-weight: bold;
      }
      .fb-alert-emergency {
        color: var(--safety-alert-emergency);
      }
      .fb-alert-alarm {
        color: var(--safety-alert-alarm);
      }
      .fb-alert-warn {
        color: var(--safety-alert-warn);
      }
      .fb-alert-caution {
        color: var(--safety-alert-caution);
      }
    `
  ]
})
export class AlertPropertiesModal implements OnInit {
  protected showProperties = true;
  protected hasProperties = false;
  protected properties: Record<string, unknown> = {};
  protected raisedAt!: string;

  protected notiMgr = inject(NotificationManager);
  protected modalRef = inject(FbBottomSheetRef) as FbBottomSheetRef<
    unknown,
    AlertPropertiesModal
  >;

  constructor(
    @Inject(FB_BOTTOM_SHEET_DATA)
    public data: {
      alert: AlertData;
    }
  ) {}

  ngOnInit() {
    this.parseAlertInfo();
  }

  toggleProperties() {
    this.showProperties = !this.showProperties;
  }

  protected severityClass(): string {
    return alertSeverityClass(this.data.alert.priority);
  }

  private parseAlertInfo() {
    this.properties = this.data.alert.properties ?? {};
    this.hasProperties = Object.keys(this.properties).length !== 0;
    const d = new Date(this.data.alert.createdAt);
    this.raisedAt = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  }
}
