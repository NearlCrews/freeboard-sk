/***********************************
Autopilot Console component
    <autopilot-console>
***********************************/
import {
  Component,
  DestroyRef,
  signal,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  effect,
  computed
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbIconComponent,
  FbMenuService,
  FbSwitchComponent,
  FbTooltipDirective,
  type FbMenuItem
} from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import { Convert } from 'src/app/lib/convert';
import { AutopilotService } from './autopilot.service';

@Component({
  selector: 'autopilot-console',
  imports: [
    CommonModule,
    DragDropModule,
    FbButtonComponent,
    FbSwitchComponent,
    FormsModule,
    FbCardComponent,
    FbCardContentComponent,
    FbIconComponent,
    FbTooltipDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./autopilot.component.css'],
  template: `
    <fb-card cdkDragHandle>
      <div
        class="autopilot-console"
        cdkDrag
        (cdkDragReleased)="dragEventHandler($event, 'released')"
      >
        <div class="title" style="cursor: grab;">
          <div style="text-align: center;width: 100%;">
            <button
              type="button"
              class="icon-warn close-btn"
              fbTooltip="Close"
              aria-label="Close autopilot console"
              (click)="handleClose()"
            >
              <fb-icon name="close" ariaLabel=""></fb-icon>
            </button>
          </div>
        </div>
        <fb-card-content>
          <div class="content">
            <div style="height: 45px;color:var(--color-text-inverse);">
              Autopilot<br />
              {{ apData().default ?? '' }}
            </div>
            <div class="lcd">
              <div style="padding: var(--space-xs) 0;display: flex;">
                <div class="dial-text-title">
                  @if (apData().default) {
                    <span>Target</span>
                  } @else {
                    <span>No Pilot</span>
                  }
                </div>
              </div>

              <div class="dial-text">
                <div class="dial-text-value">
                  @if (apData().default || apData().state === 'off-line') {
                    <span>{{ formatTargetValue(apData().target) }}</span>
                  } @else {
                    <span>--</span>
                  }
                  &deg;
                </div>
              </div>

              <div style="padding: var(--space-md) 0;display: flex;">
                <div class="dial-text-title">
                  @if (apData().default || apData().state === 'off-line') {
                    <span>{{ apData().state }}</span>
                  } @else {
                    <span>--</span>
                  }
                </div>
                <div class="dial-text-title">
                  @if (apData().default || apData().state === 'off-line') {
                    <span>{{ apData().mode }}</span>
                  } @else {
                    <span>--</span>
                  }
                </div>
              </div>
            </div>

            <div class="button-bar">
              <div style="width:50%;">
                @if (stateOptions().length > 2) {
                  <fb-button
                    style="max-width:100px;"
                    [variant]="apData().enabled ? 'danger' : 'primary'"
                    [disabled]="noPilot()"
                    (pressed)="openStateMenu($event)"
                  >
                    <div
                      style="white-space: pre;text-overflow: ellipsis;overflow: hidden;max-width:90px;"
                      [innerText]="formatLabel(apData().state)"
                    ></div>
                  </fb-button>
                } @else {
                  <fb-switch
                    [checked]="apData().enabled"
                    [disabled]="noPilot()"
                    (checkedChange)="toggleEngaged()"
                    [ariaLabel]="
                      apData().enabled
                        ? 'Disengage autopilot'
                        : 'Engage autopilot'
                    "
                    [fbTooltip]="apData().enabled ? 'Disengage' : 'Engage'"
                  ></fb-switch>
                }
              </div>

              <div>
                @if (modeOptions().length !== 0) {
                  <fb-button
                    variant="primary"
                    [disabled]="noPilot() || modeOptions().length === 0"
                    (pressed)="openModeMenu($event)"
                  >
                    Mode
                  </fb-button>
                }
              </div>
            </div>

            @if (apData().mode === 'dodge') {
              <div class="button-bar-thin">
                <div style="width:50%;">
                  <fb-button
                    variant="primary"
                    ariaLabel="Dodge port 10 degrees"
                    [disabled]="
                      !apData().default || apData().state === 'off-line'
                    "
                    (pressed)="dodgeAdjust(-10)"
                  >
                    &lt;&lt;</fb-button
                  >&nbsp;
                  <fb-button
                    variant="primary"
                    ariaLabel="Dodge port 1 degree"
                    [disabled]="
                      !apData().default || apData().state === 'off-line'
                    "
                    (pressed)="dodgeAdjust(-1)"
                  >
                    &lt;
                  </fb-button>
                </div>

                <div>
                  <fb-button
                    variant="primary"
                    ariaLabel="Dodge starboard 1 degree"
                    [disabled]="
                      !apData().default || apData().state === 'off-line'
                    "
                    (pressed)="dodgeAdjust(1)"
                  >
                    &gt;</fb-button
                  >&nbsp;
                  <fb-button
                    variant="primary"
                    ariaLabel="Dodge starboard 10 degrees"
                    [disabled]="
                      !apData().default || apData().state === 'off-line'
                    "
                    (pressed)="dodgeAdjust(10)"
                  >
                    &gt;&gt;
                  </fb-button>
                </div>
              </div>
            } @else {
              <div class="button-bar-thin">
                <div style="width:50%;">
                  <fb-button
                    variant="primary"
                    ariaLabel="Decrease target by 10"
                    [disabled]="
                      !apData().default || apData().state === 'off-line'
                    "
                    (pressed)="targetAdjust(-10)"
                  >
                    -10</fb-button
                  >&nbsp;
                  <fb-button
                    variant="primary"
                    ariaLabel="Decrease target by 1"
                    [disabled]="
                      !apData().default || apData().state === 'off-line'
                    "
                    (pressed)="targetAdjust(-1)"
                  >
                    -1
                  </fb-button>
                </div>

                <div>
                  <fb-button
                    variant="primary"
                    ariaLabel="Increase target by 1"
                    [disabled]="
                      !apData().default || apData().state === 'off-line'
                    "
                    (pressed)="targetAdjust(1)"
                  >
                    +1</fb-button
                  >&nbsp;
                  <fb-button
                    variant="primary"
                    ariaLabel="Increase target by 10"
                    [disabled]="
                      !apData().default || apData().state === 'off-line'
                    "
                    (pressed)="targetAdjust(10)"
                  >
                    +10
                  </fb-button>
                </div>
              </div>
            }

            <div class="button-bar-thin">
              <div style="text-align:center;width:100%;">
                @if (dodgeAction()) {
                  <fb-button
                    [variant]="apData().mode === 'dodge' ? 'primary' : 'ghost'"
                    [disabled]="noPilot()"
                    (pressed)="toggleDodge()"
                  >
                    Dodge
                  </fb-button>
                }
              </div>
            </div>
          </div>
        </fb-card-content>
      </div>
    </fb-card>
  `
})
export class AutopilotComponent {
  readonly close = output<void>();

  protected modeOptions = signal<string[]>([]);
  protected stateOptions = signal<{ name: string; engaged: boolean }[]>([]);
  private currentPilot: string | undefined;

  private destroyRef = inject(DestroyRef);
  private menu = inject(FbMenuService);

  apData = input<{
    default?: string;
    mode?: string;
    state?: string;
    target?: number;
    enabled?: boolean;
    availableActions?: string[];
  }>({});

  protected noPilot = computed(() => {
    return (
      !this.app.featureFlags().autopilotApi ||
      !this.apData().default ||
      !this.apData().state ||
      this.apData().state === 'off-line'
    );
  });

  protected dodgeAction = computed(() => {
    return this.apData().availableActions?.includes('dodge');
  });

  constructor(
    protected app: AppFacade,
    protected autopilot: AutopilotService
  ) {
    effect(() => {
      if (this.apData().default !== this.currentPilot) {
        this.app.debug(
          'changed default pilot:',
          this.currentPilot,
          this.apData().default
        );
        this.currentPilot = this.apData().default;
        this.fetchAPOptions();
      }
    });
  }

  /** Narrow an unknown catch value to the HTTP-error shape used by AutopilotService responses. */
  private toApiError(err: unknown): {
    status?: number;
    error?: { message?: string };
  } {
    return err && typeof err === 'object'
      ? (err as { status?: number; error?: { message?: string } })
      : {};
  }

  handleClose() {
    this.close.emit();
  }

  protected openModeMenu(event: MouseEvent) {
    const trigger = event.currentTarget as HTMLElement;
    const current = this.apData().mode;
    const items: readonly FbMenuItem[] = this.modeOptions().map((m) =>
      m === current ? { id: m, label: m, icon: 'check' } : { id: m, label: m }
    );
    this.menu
      .open(trigger, items)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        if (id) {
          this.setMode(id);
        }
      });
  }

  protected openStateMenu(event: MouseEvent) {
    const trigger = event.currentTarget as HTMLElement;
    const current = this.apData().state;
    const items: readonly FbMenuItem[] = this.stateOptions().map((s) =>
      s.name === current
        ? { id: s.name, label: s.name, icon: 'check' }
        : { id: s.name, label: s.name }
    );
    this.menu
      .open(trigger, items)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        if (id) {
          this.setState(id);
        }
      });
  }

  /** fetch AP options from server */
  private async fetchAPOptions() {
    try {
      const options = await this.autopilot.fetchOptions();
      if (options.modes && Array.isArray(options.modes)) {
        this.modeOptions.set(options.modes);
      }
      if (options.states && Array.isArray(options.states)) {
        this.stateOptions.set(options.states);
      }
    } catch {
      this.modeOptions.set([]);
      this.stateOptions.set([]);
      this.app.showMessage('No autopilot providers found!');
    }
  }

  /** engage / disengage the pilot */
  protected async toggleEngaged() {
    try {
      if (this.apData().enabled) {
        await this.autopilot.disengage();
      } else {
        await this.autopilot.engage();
      }
    } catch (error) {
      const apiErr = this.toApiError(error);
      let msg = `Error setting Autopilot state!\n`;
      if (apiErr.status === 403) {
        msg += 'Unauthorised: Please login.';
        this.app.showAlert(`Error (${apiErr.status}):`, msg);
      } else {
        this.app.showMessage(
          apiErr.error?.message ?? 'Device returned an error!'
        );
      }
    }
  }

  /** adjust device target
   * @param value Number (in degrees)
   */
  protected async targetAdjust(value: number) {
    try {
      await this.autopilot.adjustTarget(value);
    } catch (error) {
      const apiErr = this.toApiError(error);
      if (apiErr.status === 403) {
        const msg = 'Unauthorised: Please login.';
        this.app.showAlert(`Error (${apiErr.status}):`, msg);
      } else {
        this.app.showMessage(
          apiErr.error?.message ?? 'Device returned an error!'
        );
      }
    }
  }

  /** toggle dodge mode on/off */
  protected async toggleDodge() {
    try {
      await this.autopilot.dodge(this.apData().mode !== 'dodge');
      this.app.debug(`Set dodge mode.`);
    } catch (error) {
      const apiErr = this.toApiError(error);
      if (apiErr.status === 403) {
        const msg = 'Unauthorised: Please login.';
        this.app.showAlert(`Error (${apiErr.status}):`, msg);
      } else {
        this.app.showMessage(
          apiErr.error?.message ?? 'Device returned an error!'
        );
      }
    }
  }

  /** send dodge direction value */
  protected async dodgeAdjust(value: number) {
    try {
      await this.autopilot.adjustDodge(value);
    } catch (error) {
      const apiErr = this.toApiError(error);
      if (apiErr.status === 403) {
        const msg = 'Unauthorised: Please login.';
        this.app.showAlert(`Error (${apiErr.status}):`, msg);
      } else {
        this.app.showMessage(
          apiErr.error?.message ?? 'Device returned an error!'
        );
      }
    }
  }

  /** send mode command
   * @param mode Mode to set on the device
   */
  protected async setMode(mode: string) {
    try {
      await this.autopilot.mode(mode);
    } catch (error) {
      const apiErr = this.toApiError(error);
      let msg = `Error setting Autopilot mode!\n`;
      if (apiErr.status === 403) {
        msg += 'Unauthorised: Please login.';
        this.app.showAlert(`Error (${apiErr.status}):`, msg);
      } else {
        this.app.showMessage(
          apiErr.error?.message ?? 'Device returned an error!'
        );
      }
    }
  }

  /** send mode command
   * @param state Mode to set on the device
   */
  protected async setState(state: string) {
    try {
      await this.autopilot.state(state);
    } catch (error) {
      const apiErr = this.toApiError(error);
      let msg = `Error setting Autopilot state!\n`;
      if (apiErr.status === 403) {
        msg += 'Unauthorised: Please login.';
        this.app.showAlert(`Error (${apiErr.status}):`, msg);
      } else {
        this.app.showMessage(
          apiErr.error?.message ?? 'Device returned an error!'
        );
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragEventHandler(e: any, type: string) {
    this.app.debug(
      'e:',
      e,
      'type:',
      type,
      e.event.srcElement.clientLeft,
      e.event.srcElement.clientTop
    );
  }

  formatLabel(value: string | undefined) {
    return value ? value.toUpperCase() : '...';
  }

  formatTargetValue(value: number | undefined) {
    if (typeof value === 'number') {
      return Convert.radiansToDegrees(value)?.toFixed(1);
    } else return '--';
  }
}
