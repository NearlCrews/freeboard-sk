import {
  Component,
  DestroyRef,
  Input,
  output,
  ChangeDetectionStrategy,
  SimpleChanges,
  inject,
  signal,
  computed,
  OnInit,
  OnChanges
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NSEWButtonsComponent } from './nsew-buttons.component';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardHeaderComponent,
  FbCardContentComponent,
  FbCardActionsComponent,
  FbCheckboxComponent,
  FbIconComponent,
  FbInputComponent,
  FbSliderComponent,
  FbStepComponent,
  FbStepperComponent,
  FbStepActionsDirective,
  FbSwitchComponent
} from 'src/app/design-system/primitives';

import { AnchorService } from '../anchor.service';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'src/lib/signalk-client';
import { Convert, SI_BASE_UNIT, TARGET_UNIT } from 'src/app/lib/convert';
import { GeoUtils } from 'src/app/lib/geoutils';

@Component({
  selector: 'anchor-watch',
  imports: [
    FormsModule,
    MatTooltipModule,
    FbButtonComponent,
    FbCardComponent,
    FbCardHeaderComponent,
    FbCardContentComponent,
    FbCardActionsComponent,
    FbCheckboxComponent,
    FbIconComponent,
    FbInputComponent,
    FbSliderComponent,
    FbStepComponent,
    FbStepperComponent,
    FbStepActionsDirective,
    FbSwitchComponent,
    NSEWButtonsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './anchor-watch.component.html',
  styleUrls: ['./anchor-watch.component.css']
})
export class AnchorWatchComponent implements OnInit, OnChanges {
  @Input() radius = 0;
  @Input() min = 5;
  @Input() max = 250;
  @Input() raised = true;
  @Input() showSelf = false;
  readonly closed = output<void>();

  protected bgImage = '';
  protected sliderValue = 0;
  protected rodeOut = false;
  protected convert = Convert;

  // set controls
  protected useDefaultRadius = false;
  protected useSetManual = false;
  protected defaultRodeLength = signal<number>(10);
  protected defaultAlarmRadius = signal<number>(10);

  protected disableRaiseDrop = false;

  private anchor = inject(AnchorService);
  protected app = inject(AppFacade);
  private signalk = inject(SignalKClient);
  private destroyRef = inject(DestroyRef);

  protected defaultRodeLengthStr = computed(() =>
    String(this.defaultRodeLength())
  );
  protected defaultAlarmRadiusStr = computed(() =>
    String(this.defaultAlarmRadius())
  );
  protected onDefaultRodeLengthChange(v: string) {
    const n = Number(v);
    if (Number.isFinite(n)) {
      this.defaultRodeLength.set(n);
    }
  }

  protected radiusValue = signal<number>(0); // incoming alarm radius
  protected formattedRadiusValue = computed(() => {
    if (!Number.isFinite(this.radiusValue()) || this.raised) {
      return '--';
    } else {
      return `${Math.round(this.radiusValue())}${Convert.getSymbol(this.app.config.units.length)}`;
    }
  });
  protected displayRadius = signal<string>('--');

  constructor() {}

  ngOnInit() {
    this.useDefaultRadius = this.app.config.anchor.setRadius;
    this.useSetManual = this.app.config.anchor.manualSet;
    this.defaultRodeLength.update(() => {
      return Math.round(this.transformValue(this.app.config.anchor.rodeLength));
    });
    this.defaultAlarmRadius.update(() => {
      return Math.round(this.transformValue(this.app.config.anchor.radius));
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    const radiusChange = changes['radius'];
    if (radiusChange) {
      if (radiusChange.previousValue === -1) {
        this.sliderValue = Math.round(radiusChange.currentValue);
        this.max = this.sliderValue + 100;
      } else if (radiusChange.firstChange && radiusChange.currentValue !== -1) {
        this.sliderValue = Math.round(radiusChange.currentValue);
        this.max = this.sliderValue + 100;
      }
      this.radiusValue.update(() =>
        this.transformValue(radiusChange.currentValue)
      );
      this.displayRadius.update(() =>
        this.formatTransformedValue(radiusChange.currentValue)
      );
    }

    this.bgImage = `url('${
      this.raised
        ? './assets/img/anchor-radius-raised.png'
        : './assets/img/anchor-radius.png'
    }')`;
    this.rodeOut = !this.raised && this.radius !== -1;
    this.disableRaiseDrop =
      !this.showSelf || (this.raised && this.useSetManual);
  }

  /**
   * Convert the formatted value based on config.units.length
   * @param value to convert
   * @returns Transformed value
   */
  transformValue(value: number): number {
    return (
      Convert.transform(
        value,
        'm',
        this.app.config.units.length as TARGET_UNIT
      ) ?? value
    );
  }

  /**
   * Convert and format the value for display
   * @param value Value to display
   * @returns Formatted string of transformed for display
   */
  formatTransformedValue(value: number): string {
    return `${Math.round(this.transformValue(value))} ${Convert.getSymbol(this.app.config.units.length)}`;
  }

  /** Format slider thumb value for display */
  get formatSliderLabel() {
    return (value: number): string => {
      return this.formatTransformedValue(value);
    };
  }

  onDefaultRadiusChecked(checked: boolean) {
    this.useDefaultRadius = checked;
    this.app.config.anchor.setRadius = checked;
    if (!checked) {
      this.defaultAlarmRadius.update(() => {
        return Math.round(this.transformValue(this.app.config.anchor.radius));
      });
    }
    this.app.saveConfig();
  }

  onDefaultRadiusChange(e: number) {
    const converted = Convert.transform(
      e,
      this.app.config.units.length as SI_BASE_UNIT,
      'm' as TARGET_UNIT
    );
    if (converted !== null) {
      this.app.config.anchor.radius = Math.round(converted);
    }
  }

  onSetManualCheck(checked: boolean) {
    this.useSetManual = checked;
    this.app.config.anchor.manualSet = checked;
    if (!checked) {
      this.defaultRodeLength.update(() => {
        return Math.round(
          this.transformValue(this.app.config.anchor.rodeLength)
        );
      });
    }
    this.disableRaiseDrop = this.raised && this.useSetManual;
    this.app.saveConfig();
  }

  stepSetRode() {
    this.setRadius();
  }

  /**
   * @description Set the anchor alarm max radius.
   * @param value Alarm radius in meters
   */
  setRadius(value?: number) {
    this.rodeOut = true;
    if (typeof value === 'number') {
      this.displayRadius.update(() => this.formatTransformedValue(value));
    }
    if (!this.raised) {
      this.signalk
        .post(
          '/plugins/anchoralarm/setRadius',
          typeof value === 'number' ? { radius: value } : {}
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            if (typeof value === 'number') {
              this.app.config.anchor.radius = value;
            }
            this.app.saveConfig();
          },
          error: (err: unknown) => {
            this.app.parseHttpErrorResponse(err);
          }
        });
    }
  }

  /**
   * @description Set anchor position using the rode length
   */
  setManualAnchor() {
    if (typeof this.defaultRodeLength() !== 'number') {
      this.app.showAlert('Error', 'Rode length value is not a number!');
      return;
    }
    const rodeMeters = Convert.transform(
      this.defaultRodeLength(),
      this.app.config.units.length as SI_BASE_UNIT,
      'm' as TARGET_UNIT
    );
    if (rodeMeters === null) {
      this.app.showAlert('Error', 'Rode length conversion failed!');
      return;
    }
    this.app.config.anchor.rodeLength = Math.round(rodeMeters);
    this.signalk
      .post('/plugins/anchoralarm/setManualAnchor', {
        rodeLength: this.app.config.anchor.rodeLength
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.app.saveConfig();
        },
        error: (err: unknown) => {
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  /**
   * @description Handle raise / drop slide toggle change.
   * Switch is checked when anchor is DROPPED (logical inverse of raised).
   */
  dropRaiseAnchor(checked: boolean) {
    if (checked) {
      this.dropAnchor(
        this.useDefaultRadius ? this.app.config.anchor.radius : undefined
      );
    } else {
      this.raiseAnchor();
    }
  }

  /**
   * @description Drop the Anchor
   * @param radius Alarm radius to set
   */
  dropAnchor(radius?: number) {
    if (typeof radius === 'number') {
      this.app.config.anchor.radius = radius;
    }
    this.anchor.setRaisedSignal(false);
    this.signalk
      .post(
        '/plugins/anchoralarm/dropAnchor',
        typeof radius === 'number' ? { radius: radius } : {}
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.app.saveConfig();
        },
        error: (err: unknown) => {
          this.anchor.setRaisedSignal(true);
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  /**
   * @description Raise the Anchor
   */
  raiseAnchor() {
    this.signalk
      .post('/plugins/anchoralarm/raiseAnchor', {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        () => {},
        (err: unknown) => {
          this.app.parseHttpErrorResponse(err);
        }
      );
  }

  /**
   * @description Shift anchor position n,s,e,w
   * @param direction (degrees) 0 | 90 | 180 | 270
   */
  shiftAnchor(direction: number) {
    const inc = 1;
    const anchorPos = this.anchor.position();
    if (!anchorPos) {
      return;
    }
    const position = GeoUtils.destCoordinate(
      anchorPos,
      Convert.degreesToRadians(direction),
      inc
    );
    this.anchor.setAnchorPosition(position).catch((err: unknown) => {
      this.app.parseHttpErrorResponse(err);
    });
  }

  close() {
    this.closed.emit();
  }
}
