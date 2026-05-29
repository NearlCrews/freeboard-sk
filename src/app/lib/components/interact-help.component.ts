import {
  Component,
  ChangeDetectionStrategy,
  output,
  computed,
  Signal
} from '@angular/core';

import { AppFacade } from 'src/app/app.facade';
import { FBMapInteractService } from 'src/app/modules/map/fbmap-interact.service';
import { Measurements } from './measurements.component';

import {
  FbButtonComponent,
  FbIconComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';

// ********* Interaction Help Component ********

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'fb-interact-help',
  imports: [
    FbIconComponent,
    FbButtonComponent,
    FbTooltipDirective,
    Measurements
  ],
  template: `
    <div class="mat-app-background _ap_interact_help">
      @if (showHelpPanel()) {
        <div class="mat-app-background measurePanel">
          <div>
            <span style="font-weight: bold; padding: var(--space-xs)">
              <fb-icon [name]="mode.iconName" ariaLabel=""></fb-icon>
              {{ mode.iconText }}
            </span>
            @if (mode.description.length !== 0) {
              <div style="padding: var(--space-xs)">
                {{ mode.description }}
              </div>
            }
            @if (mode.steps.length !== 0) {
              <div style="padding: var(--space-xs)">
                <ol
                  style="
                margin-block-start: 0.2em;
                margin-block-end: 0.2em;
                padding-inline-start: 15px;
              "
                >
                  @for (step of mode.steps; track step) {
                    <li>{{ step }}</li>
                  }
                </ol>
              </div>
            }
          </div>

          <div style="text-align: center">
            <!-- cancel Draw button -->
            <fb-button
              class="icon-warn"
              variant="primary"
              (pressed)="close()"
              [fbTooltip]="
                mapInteract.isModifying()
                  ? 'Finish Editing'
                  : 'Cancel Operation'
              "
              fbTooltipPosition="left"
            >
              <fb-icon name="close" ariaLabel="" class="icon-warn"></fb-icon>
              {{ mapInteract.isModifying() ? 'FINISH' : 'CANCEL' }}
            </fb-button>
          </div>
        </div>
      }
      @if (showMeasurePanel()) {
        <fb-measurements
          fbTooltip="Click on the Map to start. Click cancel or the last point to end."
          [coords]="mapInteract.measurement().coords"
          [index]="mapInteract.measurement().index"
          [totalOnly]="
            mapInteract.isDrawing() && mapInteract.draw.resourceType === 'route'
          "
          (cancel)="close()"
        >
        </fb-measurements>
      }
    </div>
  `,
  styles: [
    `
      ._ap_interact_help {
        position: fixed;
        min-width: 200px;

        top: 60px;
        left: 50px;
        border: black 1px solid;
        font-family: roboto;
        font-size: 10pt;
      }

      ._ap_row {
        display: flex;
        flex-wrap: no-wrap;
        flex: 2;
      }
      ._ap_row .icon-label {
        width: 30px;
      }
      ._ap_row .row-label {
        font-weight: 500;
        min-width: 60px;
      }
      ._ap_measurements .value {
        padding-right: 10px;
      }

      @media only screen and (max-width: 500px) {
        ._ap_measurements {
          left: 0;
          width: 100%;
        }
      }
    `
  ]
})
export class InteractionHelpComponent {
  readonly cancel = output<void>();

  protected showHelpPanel: Signal<boolean>;
  protected showMeasurePanel: Signal<boolean>;

  protected mode: {
    iconName: string;
    iconText: string;
    description: string;
    steps: string[];
  } = {
    iconName: '',
    iconText: '',
    description: '',
    steps: []
  };

  constructor(
    public app: AppFacade,
    protected mapInteract: FBMapInteractService
  ) {
    this.showHelpPanel = computed(() => {
      return (
        (this.mapInteract.isDrawing() &&
          this.mapInteract.draw.resourceType !== 'route') ||
        this.mapInteract.isModifying() ||
        this.mapInteract.isBoxSelecting() ||
        (mapInteract.isMeasuring() &&
          mapInteract.measureGeometryType === 'Circle')
      );
    });

    this.showMeasurePanel = computed(() => {
      return (
        (mapInteract.isMeasuring() &&
          mapInteract.measureGeometryType === 'LineString') ||
        (mapInteract.draw.resourceType === 'route' &&
          (mapInteract.isDrawing() || mapInteract.isModifying()))
      );
    });

    if (this.showHelpPanel()) {
      if (this.mapInteract.isDrawing()) {
        this.mode = {
          iconName: 'edit',
          iconText: 'Drawing Help',
          description:
            mapInteract.draw.resourceType === 'region'
              ? ''
              : 'Click on the Map where to drop the feature.',
          steps:
            mapInteract.draw.resourceType === 'region'
              ? [
                  'Click on the Map to place a vertex of the Region.',
                  'Click on the last point to end drawing.'
                ]
              : []
        };
      } else if (this.mapInteract.isModifying()) {
        this.mode = {
          iconName: 'edit',
          iconText: 'Modify',
          description:
            mapInteract.draw.forSave.id === 'anchor'
              ? 'Click and drag to move anchor.'
              : '',
          steps:
            mapInteract.draw.forSave.id !== 'anchor'
              ? [
                  'Click and drag to move point.',
                  'Ctrl-Click or Tap-hold to remove point from a line.'
                ]
              : []
        };
      } else if (this.mapInteract.isBoxSelecting()) {
        this.mode = {
          iconName: 'highlight_alt',
          iconText: 'Select',
          description: '',
          steps: [
            'Click and drag to select area.',
            'On touch devices, press and hold then drag.'
          ]
        };
      } else if (
        mapInteract.isMeasuring() &&
        mapInteract.measureGeometryType === 'Circle'
      ) {
        this.mode = {
          iconName: 'straighten',
          iconText: 'Measure',
          description: '',
          steps: [
            'Click on the Map to start.',
            'On touch devices, press and hold then move.'
          ]
        };
      }
    }
  }

  close() {
    this.cancel.emit();
  }

  setButtonState() {
    /*if (this.index > 0 || (this.index === -1 && this.coords.length > 2)) {
      this.btnDisable.prev = false;
    } else {
      this.btnDisable.prev = true;
    }

    if (this.index !== -1 && this.index < this.coords.length - 2) {
      this.btnDisable.next = false;
    } else {
      this.btnDisable.next = true;
    }*/
  }
}
