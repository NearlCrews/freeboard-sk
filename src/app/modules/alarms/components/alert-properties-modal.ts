import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject
} from '@angular/core';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbIconComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

import { SignalKDetailsComponent } from '../../skresources';
import type { AlertData } from './alert.component';
import { NotificationManager } from '../notification-manager';
import { alertSeverityClass } from './alert-severity';

/********* AlertPropertiesModal **********
	data: {
    alert: "<string>" title text
  }
***********************************/
@Component({
  selector: 'ap-alert-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    FbButtonComponent,
    FbCardComponent,
    FbCardContentComponent,
    FbIconComponent,
    FbToolbarComponent,
    SignalKDetailsComponent
  ],
  template: `
    <div class="_ap-alert">
      <fb-toolbar style="background-color: transparent">
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
            matTooltip="Close"
            matTooltipPosition="below"
          >
            <fb-icon name="keyboard_arrow_down" ariaLabel=""></fb-icon>
          </fb-button>
        </span>
      </fb-toolbar>

      <fb-card>
        <fb-card-content>
          <div style="display:flex;flex-direction: column;">
            @if (data.alert.canAcknowledge && !data.alert.acknowledged) {
              <div style="display:flex;">
                <div style="flex: 1 1 auto;">
                  <fb-button
                    variant="danger"
                    (pressed)="notiMgr.acknowledge(data.alert.path)"
                  >
                    <fb-icon name="check" ariaLabel=""></fb-icon> Acknowledge
                  </fb-button>
                </div>
              </div>
            }
            <div style="display:flex;">
              <div class="key-label">Message:</div>
              <div style="flex: 1 1 auto;">{{ data.alert.message }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">Type:</div>
              <div style="flex: 1 1 auto;">{{ data.alert.type }}</div>
            </div>
            <div style="display:flex;">
              <div class="key-label">Priority:</div>
              <div style="flex: 1 1 auto;" [class]="severityClass()">
                {{ data.alert.priority }}
              </div>
            </div>
            <div style="display:flex;">
              <div class="key-label">Raised at:</div>
              <div style="flex: 1 1 auto;">{{ raisedAt }}</div>
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
  protected modalRef = inject(MatBottomSheetRef<AlertPropertiesModal>);

  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA)
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
