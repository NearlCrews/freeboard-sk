import {
  OnInit,
  ElementRef,
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  effect
} from '@angular/core';

import { DialogRef } from '@angular/cdk/dialog';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbCheckboxComponent,
  FbDetailPaneComponent,
  FbDialogContentDirective,
  FbDividerComponent,
  FbHintComponent,
  FbIconComponent,
  FbInputComponent,
  FbListPaneComponent,
  FbRadioComponent,
  FbRadioGroupComponent,
  FbSelectComponent,
  FbSelectionListComponent,
  FbSliderComponent,
  FbToolbarComponent,
  FbTooltipDirective,
  type FbSelectOption,
  type FbSelectionListOption
} from 'src/app/design-system/primitives';

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
import type { MFBAction } from 'src/app/types';
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
    FbDialogContentDirective,
    FbTooltipDirective,
    FbListPaneComponent,
    FbDetailPaneComponent,
    FbButtonComponent,
    FbIconComponent,
    FbInputComponent,
    FbSelectComponent,
    FbCheckboxComponent,
    FbSliderComponent,
    FbCardComponent,
    FbCardContentComponent,
    FbDividerComponent,
    FbHintComponent,
    FbToolbarComponent,
    FbSelectionListComponent,
    FbRadioGroupComponent,
    FbRadioComponent,
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

  protected readonly visibleSections: readonly SettingsSection[] = [
    { id: 'display', label: 'Display' },
    { id: 'units', label: 'Units' },
    { id: 'map', label: 'Map' },
    { id: 'course', label: 'Course' },
    { id: 'vessels', label: 'Vessels' },
    { id: 'resources', label: 'Resources' },
    { id: 'signalk', label: 'Signal K' }
  ];

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
    protected dialogRef: DialogRef<unknown, SettingsDialog>,
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
  doS57() {
    this.facade.settings.map.s57Options.depthUnit =
      this.facade.settings.units.depth;
    this.persistModel();
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
   * Handle favourites multi-selection change.
   */
  onFavSelected(urls: readonly string[]) {
    this.facade.settings.display.plugins.favourites = [...urls];
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
   */
  onResPathSelected(paths: readonly string[]) {
    this.facade.settings.resources.paths = [...paths];
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

  // Convert a Map<number, string> options source to FbSelectOption<number>[].
  protected mapToNumberOptions(
    m: ReadonlyMap<number, string>
  ): readonly FbSelectOption<number>[] {
    const out: FbSelectOption<number>[] = [];
    m.forEach((label, id) => {
      out.push({ id, label });
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

  // Convert a number[] of identical id/label values to FbSelectOption<number>[].
  protected numberListToOptions(
    list: readonly number[]
  ): readonly FbSelectOption<number>[] {
    return list.map((v) => ({ id: v, label: String(v) }));
  }

  // Map<boolean, string> isn't supported by fb-select (string | number ids
  // only); represent boolean as 0/1 and translate at the boundary.
  protected boolWindOptions(): readonly FbSelectOption<number>[] {
    const out: FbSelectOption<number>[] = [];
    this.options.preferredValues.wind.forEach((label, key) => {
      out.push({ id: key ? 1 : 0, label });
    });
    return out;
  }

  // Convert facade urls to a selection-list option set, skipping null urls.
  protected favouritesOptions(): readonly FbSelectionListOption[] {
    const activeInstrument =
      this.facade.settings.display.plugins.instruments ?? '';
    const out: FbSelectionListOption[] = [];
    for (const fav of this.facade.favouritesList) {
      if (fav.url === null) continue;
      out.push({
        id: fav.url,
        label: fav.name,
        disabled: fav.url === activeInstrument
      });
    }
    return out;
  }

  protected favouritesValues(): readonly string[] {
    return this.facade.settings.display.plugins.favourites;
  }

  protected resourcePathOptions(): readonly FbSelectionListOption[] {
    return this.facade.resourcePathList.map((p) => ({ id: p, label: p }));
  }

  protected resourcePathValues(): readonly string[] {
    return this.facade.settings.resources.paths;
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

  protected get webglAISThresholdValue(): number | null {
    return this.facade.settings.ui.webglAISThreshold ?? null;
  }
  protected set webglAISThresholdValue(v: number | null) {
    if (v === null || Number.isNaN(v)) return;
    this.facade.settings.ui.webglAISThreshold = v;
    this.persistModel();
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
    this.facade.settings.display.fab = v as MFBAction;
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

  // Numeric setters for fb-select<number> models. Skip null inputs so the
  // empty/cleared state is a no-op rather than zeroing a value out.
  protected onDarkModeSource(v: number | null): void {
    if (v === null) return;
    this.facade.settings.display.darkMode.source = v as 0 | 1 | -1;
    this.persistModel('darkTheme');
  }

  protected onAlarmSmoothing(v: number | null): void {
    if (v === null) return;
    this.facade.settings.display.depthAlarm.smoothing = v;
    this.persistModel();
  }

  protected onLabelsMinZoom(v: number | null): void {
    if (v === null) return;
    this.facade.settings.map.labelsMinZoom = v;
    this.persistModel();
  }

  protected onCenterOffset(v: number | null): void {
    if (v === null) return;
    this.facade.settings.map.centerOffset = v;
    this.persistModel();
  }

  protected onS57ColorTable(v: number | null): void {
    if (v === null) return;
    this.facade.settings.map.s57Options.colorTable = v;
    this.doS57();
  }

  protected onS57Colors(v: number | null): void {
    if (v === null) return;
    this.facade.settings.map.s57Options.colors = v as 2 | 4;
    this.doS57();
  }

  protected onS57OtherLayers(v: readonly string[]): void {
    this.facade.settings.map.s57Options.otherLayers = [...v];
    this.doS57();
  }

  protected onS57ShallowDepth(v: number | null): void {
    if (v === null) {
      this.facade.settings.map.s57Options.shallowDepth =
        defaultConfig().map.s57Options.shallowDepth;
    } else {
      this.facade.settings.map.s57Options.shallowDepth = Math.abs(v);
    }
    this.doS57();
  }

  protected onS57SafetyDepth(v: number | null): void {
    if (v === null) {
      this.facade.settings.map.s57Options.safetyDepth =
        defaultConfig().map.s57Options.safetyDepth;
    } else {
      this.facade.settings.map.s57Options.safetyDepth = Math.abs(v);
    }
    this.doS57();
  }

  protected onS57DeepDepth(v: number | null): void {
    if (v === null) {
      this.facade.settings.map.s57Options.deepDepth =
        defaultConfig().map.s57Options.deepDepth;
    } else {
      this.facade.settings.map.s57Options.deepDepth = Math.abs(v);
    }
    this.doS57();
  }

  protected onArrivalCircle(v: number | null): void {
    if (v === null) {
      this.facade.settings.course.arrivalCircle =
        defaultConfig().course.arrivalCircle;
    } else {
      this.facade.settings.course.arrivalCircle = Math.abs(v);
    }
    this.persistModel();
  }

  protected onAutoNextPointDelay(v: number | null): void {
    if (v === null) return;
    this.facade.settings.course.autoNextPointDelay = v;
    this.persistModel();
  }

  protected onVesselIconScale(v: number | null): void {
    if (v === null) return;
    this.facade.settings.vessels.iconScale = v;
    this.persistModel();
  }

  protected onFixedLat(v: number | null): void {
    this.facade.fixedPosition[1] = v ?? 0;
    this.persistModel();
  }

  protected onFixedLon(v: number | null): void {
    this.facade.fixedPosition[0] = v ?? 0;
    this.persistModel();
  }

  protected onHeadingLineLength(v: number | null): void {
    if (v === null) return;
    this.facade.settings.vessels.selfLines.heading.length = v;
    this.persistModel();
  }

  protected onCogLineLength(v: number | null): void {
    if (v === null) return;
    this.facade.settings.vessels.selfLines.cog.length = v;
    this.persistModel();
  }

  protected onRangeCircleCount(v: number | null): void {
    if (v === null) return;
    this.facade.settings.vessels.rangeCircleCount = v;
    this.persistModel();
  }

  protected onRangeCircleMinZoom(v: number | null): void {
    if (v === null) return;
    this.facade.settings.vessels.rangeCircleMinZoom = v;
    this.persistModel();
  }

  protected onRangeCirclesDistance(v: number | null): void {
    if (v === null || v < 1) {
      this.formattedNumberModel.rangeCirclesDistance = 1;
    } else {
      this.formattedNumberModel.rangeCirclesDistance = v;
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

  protected onAisStaleAge(v: number | null): void {
    if (v === null) return;
    this.facade.settings.vessels.aisStaleAge = v;
    this.persistModel();
  }

  protected onAisMaxAge(v: number | null): void {
    if (v === null) return;
    this.facade.settings.vessels.aisMaxAge = v;
    this.persistModel();
  }

  protected onAisWindApparent(v: number | null): void {
    if (v === null) return;
    this.facade.settings.vessels.aisWindApparent = v === 1;
    this.persistModel();
  }

  protected aisWindApparentNumeric(): number {
    return this.facade.settings.vessels.aisWindApparent ? 1 : 0;
  }

  protected onAisWindMinZoom(v: number | null): void {
    if (v === null) return;
    this.facade.settings.vessels.aisWindMinZoom = v;
    this.persistModel();
  }

  protected onAisCogLine(v: number | null): void {
    if (v === null) return;
    this.facade.settings.vessels.aisCogLine = v;
    this.persistModel();
  }

  protected onNotesMinZoom(v: number | null): void {
    if (v === null) return;
    this.facade.settings.resources.notes.minZoom = v;
    this.persistModel('fetchNotes');
  }

  protected onNotesGetRadius(v: number | null): void {
    if (v === null) return;
    this.facade.settings.resources.notes.getRadius = v;
    this.persistModel('fetchNotes');
  }

  protected onSignalkMaxRadius(v: number | null): void {
    if (v === null) return;
    this.facade.settings.signalk.maxRadius = v;
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
