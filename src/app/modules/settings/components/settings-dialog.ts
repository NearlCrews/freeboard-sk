import {
  OnInit,
  ElementRef,
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  effect
} from '@angular/core';

import type { NgModel } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';

import { FbListPaneComponent } from 'src/app/design-system/primitives/list-pane/list-pane.component';
import { FbDetailPaneComponent } from 'src/app/design-system/primitives/detail-pane/detail-pane.component';
import { FbButtonComponent } from 'src/app/design-system/primitives/button/button.component';
import { FbIconComponent } from 'src/app/design-system/primitives/icon/icon.component';
import { FbInputComponent } from 'src/app/design-system/primitives/input/input.component';
import {
  FbSelectComponent,
  type FbSelectOption
} from 'src/app/design-system/primitives/select/select.component';
import { FbCheckboxComponent } from 'src/app/design-system/primitives/checkbox/checkbox.component';
import { FbSliderComponent } from 'src/app/design-system/primitives/slider/slider.component';

import type {
  LineStyleConfig,
  LineStyleDef
} from './linestyle-select.component';
import { LineStyleSelectComponent } from './linestyle-select.component';
import { SignalKPreferredPathsComponent } from './signalk-preferredpaths.component';
import { SettingsOptions, SettingsFacade } from '../settings.facade';
import { WakeLockService } from 'src/app/lib/services';
import { defaultConfig } from 'src/app/app.config';
import { S57Service } from '../../map/ol';
import { AppFacade } from 'src/app/app.facade';
import { SettingsStore } from 'src/app/stores';
import type { TARGET_UNIT } from 'src/app/lib/convert';
import { Convert } from 'src/app/lib/convert';

interface PreferredPathsResult {
  save: boolean;
  value: Record<string, string>;
}

export interface SettingsSection {
  readonly id: string;
  readonly label: string;
}

//** Settings **
@Component({
  selector: 'settings-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatDialogModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatRadioModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatToolbarModule,
    FbListPaneComponent,
    FbDetailPaneComponent,
    FbButtonComponent,
    FbIconComponent,
    FbInputComponent,
    FbSelectComponent,
    FbCheckboxComponent,
    FbSliderComponent,
    SignalKPreferredPathsComponent,
    LineStyleSelectComponent
  ],
  templateUrl: './settings-dialog.html',
  styleUrls: ['./settings-dialog.css']
})
export class SettingsDialog implements OnInit {
  protected show = {
    favourites: signal<boolean>(false)
  };

  protected options: SettingsOptions;

  protected readonly activeSection = signal<string>('display');

  private static readonly BASE_SECTIONS: readonly SettingsSection[] = [
    { id: 'display', label: 'Display' },
    { id: 'units', label: 'Units' },
    { id: 'map', label: 'Map' },
    { id: 'course', label: 'Course' },
    { id: 'vessels', label: 'Vessels' },
    { id: 'resources', label: 'Resources' },
    { id: 'signalk', label: 'Signal K' },
    { id: 'experiments', label: 'Experiments' }
  ];

  protected readonly visibleSections = computed<readonly SettingsSection[]>(
    () => {
      const radarOn =
        this.app.config.experiments && this.app.featureFlags().radarApi;
      if (!radarOn) {
        return SettingsDialog.BASE_SECTIONS;
      }
      const idx = SettingsDialog.BASE_SECTIONS.findIndex(
        (s) => s.id === 'signalk'
      );
      return [
        ...SettingsDialog.BASE_SECTIONS.slice(0, idx + 1),
        { id: 'radar', label: 'Radar' },
        ...SettingsDialog.BASE_SECTIONS.slice(idx + 1)
      ];
    }
  );

  protected onSectionChange(id: string): void {
    this.activeSection.set(id);
  }

  protected aisStateFilter = {
    moored: false,
    anchored: false
  };

  // model to hold numbers that require unit conversion
  protected formattedNumberModel = {
    rangeCirclesDistance: 1000
  };

  protected unitsChangedSignal = signal<number>(0);

  private saveOnClose = false;

  // Phase 3 Batch 3: direct store injection for unit-preference helpers.
  protected settings = inject(SettingsStore);

  constructor(
    protected facade: SettingsFacade,
    protected myElement: ElementRef,
    protected dialogRef: MatDialogRef<SettingsDialog>,
    protected wakeLock: WakeLockService,
    private s57: S57Service,
    protected app: AppFacade
  ) {
    this.options = new SettingsOptions();

    effect(() => {
      this.unitsChangedSignal();
      this.formatNumberModel();
    });
  }

  ngOnInit() {
    this.facade.refresh();
    this.facade.settings.selections.aisState.forEach((i: string) => {
      if (i in this.aisStateFilter) {
        this.aisStateFilter[i as keyof typeof this.aisStateFilter] = true;
      }
    });
  }

  // format numbers in model used for form fields
  formatNumberModel() {
    this.formattedNumberModel = {
      rangeCirclesDistance:
        this.facade.settings.units.distance === 'kilometer'
          ? Math.floor(this.facade.settings.vessels.rangeCirclesDistance / 1000)
          : Math.floor(
              Convert.transform(
                this.facade.settings.vessels.rangeCirclesDistance,
                'm',
                'naut-mile'
              ) ?? 0
            )
    };
  }

  raiseChange() {
    const prefs = this.settings.serverConfig.unitPreferences();
    if (prefs) {
      this.settings.alignUnitPrefs(this.app.config, prefs);
    }
    this.unitsChangedSignal.update((current) => current + 1);
  }

  /**
   * handle dialog close action
   */
  handleClose() {
    if (this.saveOnClose) {
      this.persistModel();
    }
    this.dialogRef.close();
  }

  /** apply wakelock state */
  doWakelock(checked: boolean) {
    this.persistModel();
    if (checked) {
      this.wakeLock.disable();
    } else {
      this.wakeLock.enable();
    }
  }

  /** apply S57 Options  */
  doS57(numericAttrib?: any) {
    this.facade.settings.map.s57Options.depthUnit =
      this.facade.settings.units.depth;
    if (numericAttrib) {
      this.parseNumber(numericAttrib);
    } else {
      this.persistModel();
    }
    this.s57.setOptions(this.facade.settings.map.s57Options);
  }

  /** handle line style change */
  onLineStyle(
    lineType: 'cog' | 'heading',
    value: { lineStyle: LineStyleDef; config: LineStyleConfig }
  ) {
    const l = this.facade.settings.vessels.selfLines[lineType];
    if (l) {
      l.color = value.config.color;
      l.dash = value.config.dash;
      l.weight = value.config.weight;
      this.app.selfLines.update((current) => {
        const c = Object.assign({}, current);
        c[lineType] = value.lineStyle;
        return c;
      });
      this.persistModel();
    }
  }

  /**
   * toggle display of favourites
   */
  toggleFavourites() {
    this.show.favourites.update((current) => !current);
  }

  /**
   * Parse entered number value and fall back to default if null.
   * Resultant number value is always positive unless allowNegative = true.
   */
  parseNumber(e: NgModel, allowNegative?: boolean) {
    if (typeof e.model !== 'number') {
      e.reset(this.fallbackToDefault());
      return;
    }
    if (!allowNegative && e.model < 0) {
      e.reset(Math.abs(e.model));
    }
    this.persistModel();
  }

  /**
   * Parse & convert the entered number value to SI units and fall back to default if null.
   * Resultant number value is always positive unless allowNegative = true.
   */
  parseFormattedNumber(e: NgModel, allowNegative?: boolean) {
    if (typeof e.model !== 'number') {
      return;
    }
    if (!allowNegative && e.model < 0) {
      e.reset(Math.abs(e.model));
    }
    this.facade.settings.vessels.rangeCirclesDistance =
      this.facade.settings.units.distance === 'kilometer'
        ? Math.floor(this.formattedNumberModel.rangeCirclesDistance * 1000)
        : Math.floor(
            Convert.nauticalMilesToKm(
              this.formattedNumberModel.rangeCirclesDistance
            ) * 1000
          );
    this.persistModel();
  }

  /**
   * Returns the fallback value for an invalid number entry.
   * @returns default value
   */
  private fallbackToDefault() {
    const dconfig = defaultConfig();
    if (typeof this.facade.settings.map.s57Options.shallowDepth !== 'number') {
      return dconfig.map.s57Options.shallowDepth;
    }
    if (typeof this.facade.settings.map.s57Options.safetyDepth !== 'number') {
      return dconfig.map.s57Options.safetyDepth;
    }
    if (typeof this.facade.settings.map.s57Options.deepDepth !== 'number') {
      return dconfig.map.s57Options.deepDepth;
    }
    if (
      typeof this.facade.fixedPosition[0] !== 'number' ||
      typeof this.facade.fixedPosition[1] !== 'number'
    ) {
      return 0;
    }
    if (typeof this.facade.settings.course.arrivalCircle !== 'number') {
      return dconfig.course.arrivalCircle;
    }
    return 0;
  }

  /**
   * Persist Settings after model change
   */
  persistModel(value?: string) {
    this.facade.applySettings();
    this.facade.emitChangeEvent(value ?? '');
  }

  /**
   * Defer persisting Settings until dialog close
   */
  deferPersist(value?: string) {
    this.saveOnClose = true;
    this.facade.emitChangeEvent(value ?? '');
  }

  /**
   * Handle default intrument app selection
   */
  onInstrumentApp() {
    this.persistModel('pluginInstruments');
    this.facade.buildFavouritesList();
  }

  /**
   * Handle Preferred Paths component event
   * @param e
   */
  onPreferredPaths(e: PreferredPathsResult) {
    if (e.save) {
      this.facade.settings.units.preferredPaths = e.value as any;
      this.persistModel();
    }
  }

  /**
   * Handle favourites component event
   * @param e
   */
  onFavSelected(
    e: unknown,
    f: { selectedOptions: { selected: { value: string }[] } }
  ) {
    this.facade.settings.display.plugins.favourites =
      f.selectedOptions.selected.map((i) => i.value);
    this.persistModel();
  }

  /**
   * Handle AIS state filter change
   */
  onAisStateFilter() {
    const s: string[] = [];
    for (const i in this.aisStateFilter) {
      if (this.aisStateFilter[i as keyof typeof this.aisStateFilter]) {
        s.push(i);
      }
    }
    this.facade.settings.selections.aisState = s.slice();
    this.persistModel();
  }

  /**
   * Handle custom resource path selection changes
   * @param f
   */
  onResPathSelected(f: { selectedOptions: { selected: { value: string }[] } }) {
    this.facade.settings.resources.paths = f.selectedOptions.selected.map(
      (i) => i.value
    );
    //ensure all selected paths have relevant 'selections' entry
    this.facade.settings.resources.paths.forEach((i: string) => {
      if (i in this.facade.settings.selections.resourceSets) {
        /* already has selection array */
      } else {
        this.facade.settings.selections.resourceSets[i] = [];
      } //create selection array
    });
    this.persistModel();
  }

  /**
   * delete auth token
   */
  clearAuthToken() {
    this.facade.clearToken();
  }

  // AppListEntry.url is `string | null` in the facade. The favourites
  // string[] cannot include null, so guard the nullable case here so
  // the template stays under strict template checks.
  isFavouriteSelected(url: string | null): boolean {
    if (url === null) {
      return false;
    }
    return this.facade.settings.display.plugins.favourites.includes(url);
  }

  renderSymbol(unit: TARGET_UNIT) {
    return Convert.getSymbol(unit);
  }

  // Convert a Map<string-literal, string> options source to FbSelectOption[].
  // Accepts string-literal keys (e.g. 'kilometer' | 'naut-mile') by widening to
  // string for fb-select consumption.
  protected mapToOptions(
    m: ReadonlyMap<string, string>
  ): readonly FbSelectOption[];
  protected mapToOptions(
    m: ReadonlyMap<unknown, string>
  ): readonly FbSelectOption[];
  protected mapToOptions(
    m: ReadonlyMap<unknown, string>
  ): readonly FbSelectOption[] {
    const out: FbSelectOption[] = [];
    m.forEach((label, id) => {
      if (typeof id === 'string') {
        out.push({ id, label });
      }
    });
    return out;
  }

  // Convert a string[][] (pairs of [id, label]) to FbSelectOption[].
  protected pairsToOptions(
    pairs: readonly (readonly [string, string])[] | readonly string[][]
  ): readonly FbSelectOption[] {
    return pairs.map((p) => ({ id: p[0] as string, label: p[1] as string }));
  }

  // Convert a string[] of identical id/label values to FbSelectOption[].
  protected listToOptions(list: readonly string[]): readonly FbSelectOption[] {
    return list.map((v) => ({ id: v, label: v }));
  }

  // Two-way bridges so string-typed fb-input value() models persist into the
  // facade's string-typed fields without a wrapper subject.
  protected get instrumentsParameters(): string {
    return this.facade.settings.display.plugins.parameters ?? '';
  }
  protected set instrumentsParameters(v: string) {
    this.facade.settings.display.plugins.parameters = v;
    this.persistModel('pluginParameters');
  }

  protected get notesRootFilter(): string {
    return this.facade.settings.resources.notes.rootFilter ?? '';
  }
  protected set notesRootFilter(v: string) {
    this.facade.settings.resources.notes.rootFilter = v;
    this.persistModel('fetchNotes');
  }

  protected get videoUrl(): string {
    return this.facade.settings.resources.video.url ?? '';
  }
  protected set videoUrl(v: string) {
    this.facade.settings.resources.video.url = v;
    this.persistModel('videoUrl');
  }

  // Trail duration is numeric in storage. fb-slider models number directly.
  protected onTrailDuration(value: number): void {
    this.facade.settings.vessels.trailDuration = value;
    this.deferPersist();
  }

  // Setters that round-trip narrow string-literal union values through
  // fb-select's generic `string | null` model() without losing strict types.
  protected onFab(v: string | null): void {
    if (v === null) return;
    this.facade.settings.display.fab = v as
      | 'wpt'
      | 'pob'
      | 'autopilot'
      | 'radar';
    this.persistModel();
  }

  protected onInstrumentsApp(v: string | null): void {
    if (v === null) return;
    this.facade.settings.display.plugins.instruments = v;
    this.onInstrumentApp();
  }

  protected onDistanceUnit(v: string | null): void {
    if (v === null) return;
    this.facade.settings.units.distance = v as 'kilometer' | 'naut-mile';
    this.raiseChange();
    this.persistModel();
  }

  protected onDepthUnit(v: string | null): void {
    if (v === null) return;
    this.facade.settings.units.depth = v as 'm' | 'foot';
    this.raiseChange();
    this.doS57();
  }

  protected onLengthUnit(v: string | null): void {
    if (v === null) return;
    this.facade.settings.units.length = v as 'm' | 'foot';
    this.raiseChange();
    this.persistModel();
  }

  protected onTemperatureUnit(v: string | null): void {
    if (v === null) return;
    this.facade.settings.units.temperature = v as 'C' | 'F';
    this.raiseChange();
    this.persistModel();
  }

  protected onSpeedUnit(v: string | null): void {
    if (v === null) return;
    this.facade.settings.units.speed = v as 'kn' | 'm/s' | 'km/h' | 'mph';
    this.raiseChange();
    this.persistModel();
  }

  protected onPositionFormat(v: string | null): void {
    if (v === null) return;
    this.facade.settings.units.positionFormat = v as
      | 'XY'
      | 'SHDd'
      | 'HDd'
      | 'DMdH'
      | 'HDMS'
      | 'DHMS';
    this.persistModel();
  }

  protected onHeadingAttribute(v: string | null): void {
    if (v === null) return;
    this.facade.settings.units.headingAttribute = v as
      | 'navigation.headingTrue'
      | 'navigation.headingMagnetic';
    this.persistModel('headingAttribute');
  }

  protected onS57GraphicsStyle(v: string | null): void {
    if (v === null) return;
    this.facade.settings.map.s57Options.graphicsStyle = v as
      | 'Simplified'
      | 'Paper';
    this.doS57();
  }

  protected onS57Boundaries(v: string | null): void {
    if (v === null) return;
    this.facade.settings.map.s57Options.boundaries = v as
      | 'Symbolized'
      | 'Plain';
    this.doS57();
  }

  protected onAutoNextPointTrigger(v: string | null): void {
    if (v === null) return;
    this.facade.settings.course.autoNextPointTrigger = v as
      | 'perpendicularPassed'
      | 'arrivalCircleEntered';
    this.persistModel();
  }

  protected onTrailResolutionLastHour(v: string | null): void {
    if (v === null) return;
    this.facade.settings.vessels.trailResolution.lastHour = v;
    this.persistModel();
  }

  protected onTrailResolutionNext23(v: string | null): void {
    if (v === null) return;
    this.facade.settings.vessels.trailResolution.next23 = v;
    this.persistModel();
  }

  protected onTrailResolutionBeyond24(v: string | null): void {
    if (v === null) return;
    this.facade.settings.vessels.trailResolution.beyond24 = v;
    this.persistModel();
  }

  // fb-select requires a non-null id, so drop any AppListEntry entry that
  // carries url === null (matches the prior template's filter against null).
  protected instrumentsOptions(): readonly FbSelectOption[] {
    const out: FbSelectOption[] = [];
    for (const i of this.facade.applicationList) {
      if (i.url !== null) {
        out.push({ id: i.url, label: i.name });
      }
    }
    return out;
  }
}
