import {
  Component,
  OnInit,
  OnDestroy,
  DestroyRef,
  Input,
  output,
  ViewChild,
  SimpleChanges,
  signal,
  computed,
  input,
  effect,
  inject,
  AfterViewInit,
  OnChanges
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

// ** OL & popovers **
import { PopoverComponent } from './popovers';
import { S57_CLICKABLE_LAYERS, S57_NAMES } from './popovers/s57-consts';
import { FreeboardOpenlayersModule } from 'src/app/modules/map/ol';
import { CoordsPipe } from 'src/app/lib/pipes';

import { toLonLat } from 'ol/proj';
import { Style, Stroke, Fill } from 'ol/style';
import { Collection, Feature } from 'ol';
import { Feature as GeoJsonFeature } from 'geojson';

import { Convert } from 'src/app/lib/convert';
import { GeoUtils, Angle } from 'src/app/lib/geoutils';
import {
  LineString,
  MultiLineString,
  Position,
  ResourceSet
} from 'src/app/types';

import { AppFacade } from 'src/app/app.facade';

import {
  SKResourceService,
  FBCustomResourceService,
  SKChart,
  SKWaypoint,
  SKVessel,
  SKAtoN,
  SKAircraft,
  SKSaR,
  SKMeteo,
  SKStreamFacade,
  AnchorService,
  NotificationManager,
  CourseService,
  SettingsFacade,
  WeatherForecastModal,
  InfoPanelFacade,
  SKResourceType
} from 'src/app/modules';
import {
  mapControls,
  aircraftStyles,
  sarStyles,
  regionStyles,
  routeStyles,
  anchorStyles,
  alarmStyles,
  destinationStyles,
  laylineStyles,
  drawStyles,
  targetAngleStyle,
  raceCourseStyles,
  bearingDistanceStyle
} from './mapconfig';
import { ModifyEvent } from 'ol/interaction/Modify';
import { DrawEvent } from 'ol/interaction/Draw';
import { LineString as OlLineString, Circle as OlCircle } from 'ol/geom';
import { Coordinate } from 'ol/coordinate';
import {
  FBMapEvent,
  FBPointerEvent,
  zoomOffsetLevel,
  MapComponent
} from './ol/lib/map.component';
import WebGLTileLayer from 'ol/layer/WebGLTile';
import { chartNightMode } from './ol/lib/charts/night-mode-filter';
import { applyNightMode, removeNightMode } from './ol/lib/webgl';
import { FeatureLike } from 'ol/Feature';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  FBMapInteractService,
  DrawFeatureInfo,
  IPopover
} from './fbmap-interact.service';
import { ScaleLine } from 'ol/control';
import { Units } from 'ol/control/ScaleLine';
import { DragBoxEvent } from 'ol/interaction/DragBox';
import { MapService } from './ol/lib/map.service';

interface IResource {
  id: string;
  type: string;
}

interface IFeatureData {
  aircraft: Map<string, SKAircraft>;
  atons: Map<string, SKAtoN>;
  sar: Map<string, SKSaR>;
  meteo: Map<string, SKMeteo>;
  self: SKVessel; //self vessel
  ais: Map<string, SKVessel>; // other vessels
  active: SKVessel; // focussed vessel
  navData: { position: Position | null; startPosition: Position | null };
  closest: LineString[];
}

enum INTERACTION_MODE {
  MEASURE,
  DRAW,
  MODIFY
}

const POSITIONABLE_OVERLAY_TYPES = new Set(['ais', 'aton', 'aircraft']);

@Component({
  selector: 'fb-map',
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatButtonModule,
    CoordsPipe,
    MatMenuModule,
    MatDividerModule,
    FreeboardOpenlayersModule,
    PopoverComponent
  ],
  templateUrl: './fb-map.component.html',
  styleUrls: ['./fb-map.component.css']
})
export class FBMapComponent
  implements OnInit, OnDestroy, AfterViewInit, OnChanges
{
  @Input() setFocus = '';
  @Input() mapCenter: Position = [0, 0];
  @Input() mapZoom = 1;
  @Input() movingMap = false;
  @Input() northUp = true;
  @Input() measureMode = false;
  @Input() drawMode = false;
  @Input() modifyMode = false;
  @Input() activeRoute = '';
  @Input() vesselTrail: Position[] = [];
  @Input() dblClickZoom = false;
  @Input() overZoomTiles = true;
  readonly drawEnded = output<DrawFeatureInfo>();
  readonly activate = output<string>();
  readonly deactivate = output<string>();
  readonly info = output<IResource>();
  readonly exitMovingMap = output<boolean>();
  readonly focusVessel = output<string | null>();
  readonly menuItemSelected = output<string>();

  @ViewChild(MatMenuTrigger, { static: true }) contextMenu!: MatMenuTrigger;
  @ViewChild('olMap', { static: false }) olMap!: MapComponent;

  scaleUnits = input<string>('');

  protected perfLaylines = signal<{
    port: MultiLineString;
    starboard: MultiLineString;
  }>({ port: [], starboard: [] });
  protected perfTargetAngle = signal<LineString>([]);
  protected vesselLines = signal<{
    cog: LineString;
    heading: LineString;
  }>({
    cog: [],
    heading: []
  });

  public overlay = signal<IPopover>({
    id: null,
    type: null,
    position: [0, 0],
    show: false,
    title: '',
    content: [],
    featureCount: 0,
    readOnly: false,
    isSelf: false,
    resource: undefined
  });

  protected olMapControls = mapControls;
  protected olMapInteractions = signal<{ name: string }[]>([]);
  protected mapZoomLevel = signal<number>(1);
  protected mapCenterPositon = signal<Position>([0, 0]);
  protected mapRotation = signal<number>(0);

  // Tracks `dfeat.ais.size` reactively; `dfeat` itself is a plain object so the
  // template's WebGL-swap guard needs a signal mirror that updates on each
  // `onVessels()` pass to drive change detection at the @if boundary.
  protected aisCount = signal<number>(0);
  protected useWebGLAIS = computed<boolean>(
    () =>
      this.app.config.ui.showAisTargets &&
      this.aisCount() > this.app.config.ui.webglAISThreshold
  );

  protected showNoteslayer = signal<boolean>(false); //control notes layer display

  // ** map feature styles
  protected featureStyles = {
    route: routeStyles,
    region: regionStyles,
    anchor: anchorStyles,
    alarm: alarmStyles,
    destination: destinationStyles,
    aircraft: aircraftStyles,
    sar: sarStyles,
    layline: laylineStyles,
    targetAngle: targetAngleStyle,
    raceCourse: raceCourseStyles,
    bearingDistance: bearingDistanceStyle
  };

  // ** map feature data
  protected dfeat: IFeatureData = {
    aircraft: new Map(),
    atons: new Map(),
    sar: new Map(),
    meteo: new Map(),
    self: new SKVessel(), //self vessel
    ais: new Map(), // other vessels
    active: new SKVessel(), // focussed vessel
    navData: { position: null, startPosition: null },
    closest: []
  };

  private saveTimer: ReturnType<typeof setInterval> | null = null;
  private isDirty = false;

  protected mouse: {
    pixel: number[] | null;
    coords: Position;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xy: any;
  } = {
    pixel: null,
    coords: [0, 0],
    xy: null
  };
  contextMenuPosition = { x: '0px', y: '0px' };

  private destroyRef = inject(DestroyRef);

  private http = inject(HttpClient);
  protected app = inject(AppFacade);
  protected skres = inject(SKResourceService);
  protected skresOther = inject(FBCustomResourceService);
  protected skstream = inject(SKStreamFacade);
  protected anchor = inject(AnchorService);
  protected notiMgr = inject(NotificationManager);
  protected course = inject(CourseService);
  protected mapInteract = inject(FBMapInteractService);
  protected mapService = inject(MapService);
  private settings = inject(SettingsFacade);
  private bottomSheet = inject(MatBottomSheet);
  private infoPanel = inject(InfoPanelFacade);

  constructor() {
    effect(() => {
      if (this.scaleUnits()) {
        this.setScaleUnits();
      }
    });
    // WebGL night-mode is an opt-in alternate to the OffscreenCanvas tile
    // filter. Only `WebGLTileLayer` instances (currently PMTiles) carry the
    // shader; non-WebGL `TileLayer` paths continue to rely on the
    // OffscreenCanvas pipeline, so they remain tinted correctly. The
    // trade-off: a WebGLTileLayer whose tile loader still runs through
    // `applyChartNightFilter` will compose both tints, producing a darker
    // red than the OffscreenCanvas-only default.
    effect(() => {
      const tintEnabled =
        this.app.uiConfig().useWebGLNightMode && chartNightMode();
      const map = this.olMap?.getMap();
      if (!map) {
        return;
      }
      map.getLayers().forEach((layer) => {
        if (layer instanceof WebGLTileLayer) {
          if (tintEnabled) {
            applyNightMode(layer);
          } else {
            removeNightMode(layer);
          }
        }
      });
    });
    this.toggleDblClickZoom(); // init olMapinterations
  }

  ngAfterViewInit() {
    this.setScaleUnits();
    // ** trigger map focus **
    setTimeout(() => {
      this.setFocus = 'xxx';
    }, 500);
  }

  ngOnInit() {
    // STREAM VESSELS update event
    this.skstream
      .vessels$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onVessels());
    // SETTINGS settings.change$ event
    this.settings.change$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r: string[]) => {
        this.renderMapContents(r.includes('fetchNotes'));
        if (r.includes(`trailFromServer`)) {
          if (!this.app.config.vessels.trailFromServer) {
            this.app.selfTrailFromServer.update(() => {
              return [];
            });
          }
        }
      });
  }

  ngOnDestroy() {
    this.stopSaveTimer();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['vesselTrail']) {
      this.drawVesselLines();
    }
    const mapCenterChange = changes['mapCenter'];
    if (mapCenterChange && mapCenterChange.currentValue) {
      this.mapCenterPositon.set(mapCenterChange.currentValue);
    }
    const mapZoomChange = changes['mapZoom'];
    if (mapZoomChange && typeof mapZoomChange.currentValue === 'number') {
      this.mapZoomLevel.set(mapZoomChange.currentValue);
      this.renderMapContents(true);
    }
    const movingMapChange = changes['movingMap'];
    if (movingMapChange && !movingMapChange.firstChange) {
      if (movingMapChange.currentValue) {
        this.startSaveTimer();
      } else {
        this.stopSaveTimer();
      }
      this.centerVessel();
    }
    if (changes['northUp']) {
      this.rotateMap();
    }
    const measureModeChange = changes['measureMode'];
    if (measureModeChange) {
      this.applyInteractionMode(
        INTERACTION_MODE.MEASURE,
        measureModeChange.currentValue
      );
    }
    const drawModeChange = changes['drawMode'];
    if (drawModeChange) {
      this.applyInteractionMode(
        INTERACTION_MODE.DRAW,
        drawModeChange.currentValue
      );
    }
    const modifyModeChange = changes['modifyMode'];
    if (modifyModeChange && !modifyModeChange.firstChange) {
      this.applyInteractionMode(
        INTERACTION_MODE.MODIFY,
        modifyModeChange.currentValue
      );
    }
    const dblClickZoomChange = changes['dblClickZoom'];
    if (dblClickZoomChange) {
      this.toggleDblClickZoom(dblClickZoomChange.currentValue);
    }
  }

  // set map scale units
  private setScaleUnits() {
    try {
      const u: Units = ['kilometer', 'm'].includes(this.scaleUnits())
        ? 'metric'
        : 'nautical';
      const c = this.olMap.getMap()?.getControls().getArray();
      (c?.[0] as ScaleLine | undefined)?.setUnits(u);
    } catch {
      // no map or scale control
    }
  }

  // format WMS parameters
  protected wmsParams(chart: SKChart) {
    return {
      LAYERS: chart.layers ? chart.layers.join(',') : ''
    };
  }

  // ** periodically persist state (used in movingMap mode)
  private startSaveTimer() {
    if (!this.saveTimer) {
      this.saveTimer = setInterval(() => {
        if (this.isDirty) {
          this.app.saveConfig();
          this.isDirty = false;
        }
      }, 30000);
    }
  }

  private stopSaveTimer() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  // ********** EVENT HANDLERS *****************

  private onVessels() {
    const vesselsData = this.app.data.vessels;
    //store last position incase new position is null
    const lastPos = this.dfeat.self.position;
    this.dfeat.self = vesselsData.self;
    if (!this.dfeat.self.position || !Array.isArray(this.dfeat.self.position)) {
      this.dfeat.self.position = lastPos;
    }
    this.dfeat.ais = vesselsData.aisTargets;
    this.aisCount.set(this.dfeat.ais.size);
    this.dfeat.aircraft = this.app.data.aircraft;
    this.dfeat.sar = this.app.data.sar;
    this.dfeat.meteo = this.app.data.meteo;
    this.dfeat.atons = this.app.data.atons;
    this.dfeat.active = vesselsData.active;
    const courseData = this.course.courseData();
    this.dfeat.navData.position = courseData.position;
    this.dfeat.navData.startPosition = courseData.startPosition;
    // calculate CPA lines
    const selfPos = vesselsData.self.position;
    const closest: LineString[] = [];
    if (selfPos) {
      vesselsData.closest.forEach((id: string) => {
        const a = vesselsData.aisTargets.get(id);
        if (a?.position) {
          closest.push([a.position, selfPos]);
        }
      });
    }
    this.dfeat.closest = closest;

    // ** update vessel on map **
    if (this.dfeat.self.positionReceived) {
      vesselsData.showSelf = true;
    }
    // ** locate vessel popover
    const ov = this.overlay();
    if (
      ov.show &&
      ov.type !== null &&
      POSITIONABLE_OVERLAY_TYPES.has(ov.type)
    ) {
      if (ov.isSelf) {
        const selfPos = this.dfeat.self.position;
        this.overlay.update((current) => {
          return Object.assign({}, current, {
            position: selfPos ?? current.position,
            vessel: this.dfeat.self
          });
        });
      } else if (ov.id !== null) {
        if (
          (ov.type === 'ais' && !this.dfeat.ais.has(ov.id)) ||
          (ov.type === 'atons' && !this.dfeat.atons.has(ov.id)) ||
          (ov.type === 'aircraft' && !this.dfeat.aircraft.has(ov.id))
        ) {
          this.overlay.update((current) => ({ ...current, show: false }));
        } else if (ov.type === 'ais') {
          this.overlay.update((current) => {
            const id = current.id;
            if (id === null) return current;
            const v = this.dfeat.ais.get(id);
            if (!v) return current;
            return Object.assign({}, current, {
              position: v.position ?? current.position,
              vessel: v
            });
          });
        }
      }
      const extent = this.app.mapExtent();
      const ext0 = extent[0];
      const ext2 = extent[2];
      if (
        typeof ext0 === 'number' &&
        typeof ext2 === 'number' &&
        ext0 < 180 &&
        ext2 > 180
      ) {
        // if dateline is in view adjust overlay position to stay with vessel
        const ovPos = this.overlay().position;
        if (ovPos[0] < 0 && ovPos[0] > -180) {
          this.overlay.update((current) => {
            return Object.assign({}, current, {
              position: [
                current.position[0] + 360,
                current.position[1]
              ] as Position
            });
          });
        }
      }
    }
    this.drawVesselLines(this.app.data.vessels.self.positionReceived);
    this.rotateMap();
    if (this.movingMap) {
      this.centerVessel();
    }
  }

  // ********** MAP EVENT HANDLERS *****************

  private toggleDblClickZoom(set?: boolean) {
    const olInteractions: { name: string }[] = [
      { name: 'dragpan' },
      { name: 'dragzoom' },
      { name: 'keyboardpan' },
      { name: 'keyboardzoom' },
      { name: 'mousewheelzoom' },
      { name: 'pinchzoom' }
    ];

    this.olMapInteractions.update(() => {
      return set
        ? [{ name: 'doubleclickzoom' }, ...olInteractions]
        : [...olInteractions];
    });
  }

  // ** handle context menu choices **
  protected onContextMenuAction(action: string, pos: Position) {
    switch (action) {
      case 'add_wpt':
        this.skres.newWaypointAt(pos);
        break;
      case 'add_note':
        // showNoteEditor's param is typed null; consumers pass overlay objects
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.skres.showNoteEditor({ position: pos } as any);
        break;
      case 'nav_to':
        // activeWaypoint is declared string in FBAppData but course.store also sets it to null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.app.data as any).activeWaypoint = null;
        // pointNames is reset by initCourseData(); setDestination triggers
        // a fresh course payload via the delta stream so the mutation here
        // is redundant. courseData is Readonly<CourseData> after the
        // strict ratchet.
        this.course.setDestination({
          latitude: pos[1],
          longitude: pos[0]
        });
        break;
      case 'bearing_dist':
        this.formatPopover('bearing_dist', pos);
        break;
      case 'weather_forecast':
        this.bottomSheet.open(WeatherForecastModal, {
          disableClose: true,
          data: {
            title: 'Forecast',
            position: pos,
            subTitle: 'Location: Cursor Position'
          }
        });
        break;
      case 'measure':
        this.mapInteract.startMeasuring();
        break;
      default:
        this.menuItemSelected.emit(action);
        break;
    }
  }

  // handle map move / zoom
  protected onMapMoveEnd(e: FBMapEvent) {
    this.app.config.map.zoomLevel = e.zoom;

    this.app.mapExtent.update(() => e.extent);
    this.app.mapViewTopCenter.update(() => e.topCenter as Position);
    this.app.mapViewRightCenter.update(() => e.rightCenter as Position);
    this.app.mapViewRotation.update(() => e.rotation);
    this.app.config.map.center = e.lonlat as Position;

    this.drawVesselLines();
    if (!this.movingMap) {
      this.app.saveConfig();
      this.isDirty = false;
    } else {
      this.isDirty = true;
    }

    // render map features
    this.renderMapContents(e.zoomChanged);
  }

  // pointer events
  protected onMapPointerMove(e: FBPointerEvent) {
    this.mouse.pixel = e.pixel;
    this.mouse.xy = e.coordinate;
    this.mouse.coords = GeoUtils.normaliseCoords(e.lonlat as Position);
    if (this.mapInteract.isMeasuring()) {
      const coords = this.mapInteract.measurement().coords ?? [];
      if (
        this.mapInteract.measureGeometryType === 'LineString' &&
        coords.length !== 0
      ) {
        const c = e.lonlat as Position;
        const lm = this.mapInteract.distanceFromLastPoint(c);
        const lastCoord = coords[coords.length - 1];
        const b = lastCoord ? GeoUtils.greatCircleBearing(lastCoord, c) : 0;
        this.overlay.update((current) => {
          return Object.assign({}, current, {
            position: c,
            title: `${this.app.formatValueForDisplay(
              lm,
              'm'
            )} ${this.app.formatValueForDisplay(b, 'deg')}`
          });
        });
      } else if (this.mapInteract.measureGeometryType === 'Circle') {
        const c = e.lonlat as Position;
        const lm = this.mapInteract.distanceFromCenter(c);
        const b = GeoUtils.greatCircleBearing(
          this.mapInteract.measurement().center ?? c,
          c
        );
        this.overlay.update((current) => {
          return Object.assign({}, current, {
            position: c,
            title: `${this.app.formatValueForDisplay(
              lm,
              'm'
            )} ${this.app.formatValueForDisplay(b, 'deg')}`
          });
        });
      }
    }
  }

  protected onMapPointerDrag() {
    if (!this.app.config.map.lockMoveMap && this.app.uiConfig().mapMove) {
      this.exitMovingMap.emit(true);
    }
  }

  protected onMapPointerDown(e: FBPointerEvent) {
    this.mouse.coords = GeoUtils.normaliseCoords(e.lonlat as Position);
    // OL fires MapBrowserEvent synthetically in some interaction states
    // (e.g. drag-recovery, autopan) with no originalEvent.
    const orig = e.originalEvent as PointerEvent | undefined;
    if (!orig) return;
    this.contextMenuPosition.x = orig.clientX + 'px';
    this.contextMenuPosition.y = orig.clientY + 'px';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected onMapSingleClick(e: any) {
    this.app.data.map.atClick = {
      features: e.features,
      lonlat: e.lonlat
    };
    if (this.mapInteract.isMeasuring()) {
      // measuring
      this.parseClickInMeasureMode(e.lonlat);
    } else if (
      // drawing
      this.mapInteract.isDrawing() &&
      this.mapInteract.draw.resourceType === 'route'
    ) {
      this.onDrawClick(e.features);
    } else if (
      //not interacting
      !this.mapInteract.isDrawing() &&
      !this.mapInteract.isModifying()
    ) {
      if (!this.app.config.map.popoverMulti) {
        this.overlay.update((current) => {
          return Object.assign({}, current, {
            show: false
          });
        });
      }
      this.processMapClick(e);
    }
  }

  /** Handle right click / touch hold */
  protected onMapRightClick(e: { features: FeatureLike[]; lonlat: Position }) {
    this.app.data.map.atClick = e;
    this.app.debug(`onRightClick()`, this.app.data.map.atClick);
    if (this.mapInteract.isMeasuring()) {
      this.parseClickInMeasureMode(e.lonlat);
    }
  }

  /** Handle Map context menu event */
  protected onMapContextMenu(e: PointerEvent) {
    this.app.debug(`onMapContextMenu()`, this.app.data.map.atClick);
    this.onContextMenu(e);
  }

  /** Handle ol-map container context menu event */
  protected onContextMenu(e: PointerEvent) {
    this.app.debug(`onContextMenu()`, this.app.data.map.atClick);
    if (this.app.uiCtrl().suppressContextMenu || this.overlay().show) {
      return;
    }
    e.preventDefault();
    this.contextMenuPosition.x = e.clientX + 'px';
    this.contextMenuPosition.y = e.clientY + 'px';
    this.contextMenu.menuData = { item: this.mouse.coords };
    if (this.mapInteract.isMeasuring()) {
      this.parseClickInMeasureMode(this.mouse.xy.lonlat);
    } else if (!this.modifyMode) {
      if (!this.mouse.xy) {
        return;
      }
      this.contextMenu.openMenu();
      const backdrop = document.getElementsByClassName(
        'cdk-overlay-backdrop'
      )[0];
      backdrop?.addEventListener('contextmenu', (offEvent) => {
        offEvent.preventDefault(); // prevent default context menu for overlay
        this.contextMenu.closeMenu();
      });
    }
  }

  /** process pointer click event when in measure mode */
  private parseClickInMeasureMode(pos: Position) {
    const measurement = this.mapInteract.measurement();
    if (
      this.mapInteract.measureGeometryType === 'LineString' &&
      measurement &&
      (measurement.coords?.length ?? 0) !== 0
    ) {
      this.onMeasureClick(pos);
    }
  }

  /** Toggle display of chart feature  */
  public toggleFeatureSelection(id: string | string[], resType: 'charts') {
    if (resType === 'charts') {
      this.skres.chartSelected(id);
    }
  }

  /** Handle OL interaction start event */
  protected onDragBoxStart(e: DragBoxEvent) {
    const c = toLonLat(e.coordinate);
    this.mapInteract.initBoxCoord(c as Position);
  }

  /** Handle OL interaction end event */
  protected onDragBoxEnd(e: DragBoxEvent) {
    const c = toLonLat(e.coordinate);
    this.mapInteract.stopBoxSelection(c as Position);
  }

  /** Handle OL interaction end event */
  protected onDragBoxCancel(e: DragBoxEvent) {
    this.app.debug(`onDragBoxCancel()...`);
    this.mapInteract.stopBoxSelection();
  }

  /** Handle OL interaction start event */
  protected onMeasureStart(e: DrawEvent) {
    this.app.debug(`onMeasureStart()...`, this.mapInteract.measureGeometryType);
    let ovPosition: Position;
    if (this.mapInteract.measureGeometryType === 'LineString') {
      const geom = e.feature.getGeometry() as OlLineString;
      let c: Position[] = geom
        .getCoordinates()
        .map((p) => toLonLat(p as [number, number]) as Position);
      c = c.slice(0, c.length - 1);
      this.mapInteract.measurementCoords = c;
      ovPosition = (c[0] ?? [0, 0]) as Position;
    } else {
      const g = e.feature.getGeometry() as OlCircle;
      const center = toLonLat(g.getCenter());
      const radius: number = g.getRadius();
      this.mapInteract.measurementCenter = center as Position;
      this.mapInteract.measurementRadius = radius;
      ovPosition = center as Position;
      this.app.debug(this.mapInteract.measurement);
    }
    this.formatPopover(null, null);
    this.overlay.update((current) => {
      return Object.assign({}, current, {
        position: ovPosition,
        title: '0',
        show: true,
        type: 'measure'
      });
    });
  }

  /** Process pointer click in MEASURE mode */
  protected onMeasureClick(pt: Position) {
    this.app.debug(`onMeasureClick()...`);
    if (!Array.isArray(pt)) {
      return;
    }
    const coords = this.mapInteract.measurement().coords ?? [];
    const lastPt = coords[coords.length - 1];
    if (lastPt && pt[0] === lastPt[0] && pt[1] === lastPt[1]) {
      return;
    }
    const lm = this.mapInteract.addMeasurementCoord(pt);
    // ** update popover measurement values
    const newCoords = this.mapInteract.measurement().coords ?? [];
    const tail = newCoords.slice(-2);
    const t0 = tail[0];
    const t1 = tail[1];
    const b = t0 && t1 ? GeoUtils.greatCircleBearing(t0, t1) : 0;
    this.overlay.update((current) => {
      return Object.assign({}, current, {
        position: pt,
        title: `${this.app.formatValueForDisplay(
          lm,
          'm'
        )} ${this.app.formatValueForDisplay(b, 'deg')}`
      });
    });
  }

  /** Handle OL interaction start event */
  protected onMeasureEnd() {
    this.app.debug(`onMeasureEnd()...`);
    this.overlay.update((current) => {
      return Object.assign({}, current, {
        show: false
      });
    });
    this.mapInteract.stopMeasuring();
  }

  /**
   * Process pointer click in DRAW mode
   * @param fa Array of Features
   */
  protected onDrawClick(fa: Feature[]) {
    if (!Array.isArray(fa)) {
      return;
    }
    if (this.mapInteract.draw.resourceType === 'route') {
      let rteCoords: Position[] = [];
      fa.forEach((f: Feature) => {
        const geom = f.getGeometry();
        if (geom?.getType() === 'LineString') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rteCoords = (geom as any)
            .getCoordinates()
            .map((c: Position) => toLonLat(c as [number, number]) as Position);
          rteCoords = rteCoords.slice(0, rteCoords.length - 1);
        }
      });
      this.mapInteract.measurementCoords = rteCoords;
    }
  }

  /** Handle OL interaction end event */
  protected onDrawEnd(e: { feature: Feature }) {
    this.mapInteract.stopDrawing(e.feature);
    this.drawEnded.emit(this.mapInteract.draw);
  }

  /** Enter modify mode */
  public modifyFeature(featureType?: string) {
    if (this.mapInteract.draw.features.getLength() === 0) {
      return;
    }
    this.mapInteract.startModifying(this.overlay());
    if (this.overlay().type === 'route') {
      const overlayId = this.overlay().id;
      if (overlayId !== null) {
        const entry = this.skres.fromCache('routes', overlayId);
        const route = entry?.[1];
        if (route?.feature?.geometry?.coordinates) {
          this.mapInteract.measurementCoords =
            route.feature.geometry.coordinates;
        }
      }
    }
    if (featureType === 'anchor') {
      this.overlay().type = featureType;
      this.mapInteract.draw.forSave.id = featureType;
    }
  }

  /** Handle OL modify start event */
  protected onModifyStart(e: ModifyEvent) {
    const f = e.features.getArray()[0];
    if (!f) {
      return;
    }
    const geom = f.getGeometry() as OlLineString | undefined;
    this.mapInteract.draw.coordinates = geom?.getCoordinates() ?? null;
    if (!this.mapInteract.draw.forSave.id) {
      // initialise save info
      this.mapInteract.draw.forSave.id = f.getId() as string;
    }
    if (geom?.getType() === 'LineString') {
      const meta = f.get('pointMetadata');
      if (meta) {
        this.mapInteract.draw.forSave.coordsMetadata = meta;
      }
    }
  }

  /** Handle OL modify end event */
  protected onModifyEnd(e: ModifyEvent) {
    const f = e.features.getArray()[0];
    if (!f) {
      return;
    }
    const fid = f.getId() as string;
    const geom = f.getGeometry() as OlLineString | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = geom?.getCoordinates();
    if (geom?.getType() === 'LineString') {
      this.updateCoordsMeta(
        this.mapInteract.draw.coordinates ?? [],
        c,
        this.mapInteract.draw.forSave.coordsMetadata
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pc: any;
    if (fid.split('.')[0] === 'route') {
      pc = this.transformCoordsArray(c);
      this.mapInteract.measurementCoords = pc;
    } else if (fid.split('.')[0] === 'region') {
      for (let i = 0; i < c.length; i++) {
        if (this.isCoordsArray(c[i])) {
          c[i] = this.transformCoordsArray(c[i]);
        } else {
          for (let p = 0; p < c[i].length; p++) {
            if (this.isCoordsArray(c[i][p])) {
              c[i][p] = this.transformCoordsArray(c[i][p]);
            } else {
              console.log('Invalid polygon coordinates!');
            }
          }
        }
      }
      pc = c;
    } else {
      // point feature
      pc = toLonLat(c);
      // shift anchor
      if (fid === 'anchor') {
        this.anchor.setAnchorPosition(pc)?.catch((err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        });
      }
    }
    if (this.mapInteract.draw.forSave) {
      this.mapInteract.draw.forSave.coords = pc;
    }
    const forSaveId = this.mapInteract.draw.forSave?.id;
    if (
      this.app.data.activeRoute &&
      typeof forSaveId === 'string' &&
      forSaveId.includes(this.app.data.activeRoute)
    ) {
      this.app.data.activeRouteIsEditing = true;
    } else {
      this.app.data.activeRouteIsEditing = false;
    }
    this.app.data.editingId = forSaveId;

    this.app.debug(this.mapInteract.draw.forSave);
  }

  /** Process pointer click in non-interaction mode */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processMapClick(e: any) {
    this.s57Features = {};
    const featureList = new Map<
      string,
      {
        id: string;
        coord: Position;
        icon: string;
        text: string;
      }
    >(); // features under pointer
    const chartBoundsFeatures = new Map<
      string,
      {
        id: string;
        coord: Position;
        icon: string;
        text: string;
      }
    >(); // chart bounds under pointer
    const fa: Feature[] = []; // features that can be the target of modify interaction
    let maskPopover = false; // suppress popover display

    // process list of features at click location
    e.features.forEach((feature: Feature) => {
      let id = feature.getId() as string | undefined;
      let addToFeatureList = false;
      let aton: SKAtoN | undefined;
      let sar: SKSaR | undefined;
      let meteo: SKMeteo | undefined;
      let aircraft: SKAircraft | undefined;
      let vessel: SKVessel | undefined;
      let icon = '';
      let text = '';
      if (id && typeof id === 'string') {
        const t = id.split('.');
        const prefix = t[0] ?? '';
        const suffix = t[1] ?? '';
        if (prefix === 'chart-backdrop') {
          maskPopover = true;
          return;
        }
        if (prefix === 'chart-bound') {
          chartBoundsFeatures.set(id, {
            id: suffix,
            coord: e.lonlat,
            icon: icon,
            text: feature.get('name')
          });
        }
        switch (prefix) {
          case 'rset':
            addToFeatureList = true;
            icon = 'star';
            text = feature.get('name');
            break;
          case 'alarm':
            addToFeatureList = true;
            icon = 'notification_important';
            text = `Alarm: ${feature.get('type')}`;
            break;
          case 'anchor':
            addToFeatureList = true;
            icon = 'anchor';
            text = `${prefix}`;
            break;
          case 'dest':
            addToFeatureList = true;
            icon = 'flag';
            text = 'Destination';
            break;
          case 'note': {
            // Note features carry a POI-category icon name (e.g. 'marina',
            // 'boat_ramp') that is not a Material Icons ligature. Use a
            // safe Material glyph so the feature-list panel does not
            // render the literal POI-category text.
            icon = 'local_offer';
            addToFeatureList = true;
            text = this.skres.fromCache('notes', suffix)?.[1]?.name ?? '';
            break;
          }
          case 'route': {
            icon = 'route'; //'directions';
            addToFeatureList = true;
            text = this.skres.fromCache('routes', suffix)?.[1]?.name ?? '';
            break;
          }
          case 'waypoint': {
            icon = 'location_on';
            addToFeatureList = true;
            text = this.skres.fromCache('waypoints', suffix)?.[1]?.name ?? '';
            break;
          }
          case 'atons':
          case 'aton':
          case 'shore':
            icon = 'beenhere';
            addToFeatureList = true;
            aton = this.app.data.atons.get(id);
            text = aton ? aton.name || aton.mmsi : '';
            break;
          case 'sar':
            icon = 'tour';
            addToFeatureList = true;
            sar = this.app.data.sar.get(id);
            text = sar ? sar.name || sar.mmsi : 'SaR Beacon';
            break;
          case 'meteo':
            icon = 'air';
            addToFeatureList = true;
            meteo = this.app.data.meteo.get(id);
            text = meteo ? meteo.name || meteo.mmsi : 'Weather Station';
            break;
          case 'ais-vessels':
            icon = 'directions_boat';
            addToFeatureList = true;
            vessel = this.dfeat.ais.get(`vessels.${suffix}`);
            text = vessel ? vessel.name || vessel.mmsi : '';
            break;
          case 'vessels':
            icon = 'directions_boat';
            addToFeatureList = true;
            text = this.dfeat.self.name
              ? this.dfeat.self.name + ' (self)'
              : 'self';
            break;
          case 'region':
            addToFeatureList = true;
            icon = 'tab_unselected';
            text = feature.get('name');
            break;
          case 'aircraft':
            icon = 'airplanemode_active';
            addToFeatureList = true;
            aircraft = this.app.data.aircraft.get(id);
            text = aircraft ? aircraft.name || aircraft.mmsi : '';
            break;
        }
      } else if (!id && feature.getProperties) {
        const props = feature.getProperties();
        // S57 features
        if (props['RCID'] && S57_CLICKABLE_LAYERS.has(props['layer'])) {
          id = `s57.${props['LNAM']}`;
          addToFeatureList = true;
          icon = 'beenhere';
          text = S57_NAMES[props['layer']] ?? '';
          this.s57Features[id] = props;
        }
      }

      if (addToFeatureList && id && !featureList.has(id)) {
        featureList.set(id, {
          id: id,
          coord: e.lonlat,
          icon: icon,
          text: text
        });
        fa.push(feature);
      }
    });

    if (chartBoundsFeatures.size > 0) {
      // show list of chart features
      this.formatPopover('chartlist.', e.lonlat, chartBoundsFeatures);
      return;
    }
    if (maskPopover) {
      return;
    }
    this.mapInteract.draw.features = new Collection(fa);
    if (featureList.size === 1) {
      // only 1 feature
      const v = featureList.values().next().value;
      if (v) {
        this.formatPopover(v.id, v.coord);
      }
    } else if (featureList.size > 1) {
      // show list of features
      this.formatPopover('list.', e.lonlat, featureList);
    }
  }

  private s57Features: Record<string, Record<string, string | number>> = {};

  // ******** POPOVER ACTIONS ************

  /**
   * build popover for selected feature
   * @param id: feature id
   * @param coord Position to display the popover
   * @param featureList list of map features at the supplied position
   * */

  protected formatPopover(
    id: string | null,
    coord: Position | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    featureList?: Map<string, any>
  ) {
    if (!id || !coord) {
      this.overlay.update((current) => {
        return Object.assign({}, current, { show: false });
      });
      return;
    }

    const poData: IPopover = {
      show: false,
      content: [],
      id: null,
      type: null,
      title: '',
      featureCount: this.mapInteract.draw.features?.getLength() ?? 0,
      position: coord,
      readOnly: false,
      isSelf: false,
      resource: undefined
    };

    const t = id.split('.');
    const prefix = t[0] ?? '';
    const suffix = t[1] ?? '';

    switch (prefix) {
      case 's57': {
        poData.id = id;
        poData.title = 'S57 Feature';
        poData.type = 's57';
        const s57 = this.s57Features[id];
        if (s57) {
          poData.s57Feature = s57;
        }
        poData.position = coord;
        poData.show = true;
        poData.readOnly = true;
        break;
      }
      case 'anchor':
        this.modifyFeature('anchor');
        return;
      case 'bearing_dist': {
        const selfPos = this.app.data.vessels.self.position;
        const d = selfPos ? (GeoUtils.distanceTo(selfPos, coord) ?? 0) : 0;
        const b = selfPos
          ? (GeoUtils.greatCircleBearing(selfPos, coord) ?? 0)
          : 0;
        poData.type = prefix;
        poData.title = `${this.app.formatValueForDisplay(d, 'm')} ${this.app.formatValueForDisplay(b, 'deg')}`;
        poData.position = coord;
        poData.show = true;
        break;
      }
      case 'list':
        poData.type = prefix;
        poData.title = 'Features';
        poData.content = [];
        featureList?.forEach((f) => poData.content.push(f));
        poData.show = true;
        break;
      case 'chartlist':
        poData.type = prefix;
        poData.content = [];
        featureList?.forEach((f) => poData.content.push(f));
        poData.show = true;
        break;
      case 'alarm': {
        const aid = id.split('.').slice(1).join('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const alm = this.notiMgr.getAlert(aid) as any;
        if (!alm) {
          return;
        }
        poData.type = prefix;
        poData.alarm = alm;
        poData.id = aid;
        poData.show = true;
        break;
      }
      case 'vessels':
        poData.type = 'ais';
        poData.isSelf = true;
        poData.vessel = this.dfeat.self;
        poData.position = this.dfeat.self.position ?? coord;
        poData.show = true;
        break;
      case 'ais-vessels': {
        const aid = id.slice(4);
        const v = this.dfeat.ais.get(aid);
        if (!v) {
          return;
        }
        poData.type = 'ais';
        poData.id = aid;
        poData.vessel = v;
        poData.position = v.position ?? coord;
        poData.show = true;
        break;
      }
      case 'atons':
      case 'aton':
      case 'shore': {
        const at = this.app.data.atons.get(id);
        if (!at) {
          return;
        }
        poData.type = 'aton';
        poData.id = id;
        poData.aton = at;
        poData.position = at.position ?? coord;
        poData.show = true;
        break;
      }
      case 'sar': {
        const sr = this.app.data.sar.get(id);
        if (!sr) {
          return;
        }
        poData.type = 'aton';
        poData.id = id;
        poData.aton = sr;
        poData.position = sr.position ?? coord;
        poData.show = true;
        break;
      }
      case 'meteo': {
        const mt = this.app.data.meteo.get(id);
        if (!mt) {
          return;
        }
        poData.type = prefix;
        poData.id = id;
        poData.aton = mt;
        poData.position = mt.position ?? coord;
        poData.show = true;
        break;
      }
      case 'aircraft': {
        const ac = this.app.data.aircraft.get(id);
        if (!ac) {
          return;
        }
        poData.type = prefix;
        poData.id = id;
        poData.aircraft = ac;
        poData.position = ac.position ?? coord;
        poData.show = true;
        break;
      }
      case 'region': {
        const entry = this.skres.fromCache('regions', suffix);
        if (!entry) {
          return;
        }
        poData.id = suffix;
        poData.type = prefix;
        poData.title = 'Region';
        poData.resource = entry;
        poData.show = true;
        poData.readOnly = entry[1].feature.properties?.['readOnly'] === true;
        break;
      }
      case 'note': {
        const entry = this.skres.fromCache('notes', suffix);
        if (!entry) {
          return;
        }
        poData.readOnly = entry[1].properties['readOnly'] === true;
        poData.id = suffix;
        poData.type = prefix;
        poData.title = 'Note';
        poData.resource = entry;
        if (poData.readOnly) {
          poData.show = false;
          this.overlay.set(poData);
          this.popoverInfo();
        } else {
          poData.show = true;
        }
        break;
      }
      case 'route': {
        const entry = this.skres.fromCache('routes', suffix);
        if (!entry) {
          return;
        }
        poData.id = suffix;
        poData.type = prefix;
        poData.title = 'Route';
        poData.resource = entry;
        poData.show = true;
        poData.readOnly = entry[1].feature.properties?.['readOnly'] === true;
        break;
      }
      case 'waypoint': {
        const entry = this.skres.fromCache('waypoints', suffix);
        if (!entry) {
          return;
        }
        poData.id = suffix;
        poData.type = prefix;
        poData.resource = entry;
        poData.title = 'Waypoint';
        poData.show = true;
        poData.readOnly = entry[1].feature.properties?.['readOnly'] === true;
        break;
      }
      case 'dest':
        poData.id = id;
        poData.type = 'destination';
        poData.resource = this.skres.buildWaypoint(coord) as unknown as [
          string,
          SKWaypoint
        ];
        poData.title = this.course.courseData().destPointName ?? 'Destination';
        poData.show = true;
        break;
      case 'rset':
        poData.id = id;
        poData.type = prefix;
        poData.resource = this.skresOther.fromResourceSetCache(id, true);
        poData.title =
          (poData.resource as GeoJsonFeature)?.properties?.['name'] ??
          'Resource Set';
        poData.show = poData.resource ? true : false;
        break;
      default:
        return;
    }
    this.overlay.set(poData);
    this.dispatchToInfoPanel(poData);
  }

  /**
   * Mirror the map-click selection into the left info-panel. Replaces
   * the on-map popover render path: the overlay() signal stays as the
   * selection state used by modify and delete flows, but the info-panel
   * now owns presentation. Measurement clicks (bearing_dist) stay
   * on-map because they show ad-hoc distance and bearing, not a
   * persistent feature.
   */
  private dispatchToInfoPanel(po: IPopover): void {
    if (!po.show || !po.type) {
      return;
    }
    switch (po.type) {
      case 's57':
        if (po.id && po.s57Feature) {
          this.infoPanel.openS57(
            po.id,
            po.title || 'S57 Feature',
            po.s57Feature
          );
        }
        return;
      case 'list': {
        // fb-map's featureList entries carry { id, coord, icon, text }
        // where `text` is the resource name resolved from the cache.
        // The info-panel FeatureListEntry uses `label`, so we map
        // text -> label. `type` is derived from the id prefix so users
        // see at a glance what kind of feature each row is. `icon` is
        // only forwarded when it is a known Material Icons ligature
        // (the prefix-driven set fb-map's case branch assigns); raw
        // POI-category strings like 'marina' or 'boat_ramp' are
        // dropped so fb-icon does not render them as literal text.
        const KNOWN_ICONS = new Set<string>([
          'local_offer',
          'route',
          'location_on',
          'tab_unselected',
          'beenhere',
          'star',
          'flag',
          'anchor',
          'air',
          'directions_boat',
          'airplanemode_active',
          'notification_important',
          'tour'
        ]);
        this.infoPanel.openFeatureList(
          po.title || 'Features',
          (
            po.content as {
              id?: string;
              text?: string;
              icon?: string;
            }[]
          ).map((entry) => {
            const id = String(entry?.id ?? '');
            const dot = id.indexOf('.');
            const type = dot > -1 ? id.slice(0, dot) : '';
            const label = entry?.text || id;
            const payload: {
              id: string;
              label: string;
              icon?: string;
              type?: string;
            } = { id, label };
            if (entry?.icon && KNOWN_ICONS.has(entry.icon)) {
              payload.icon = entry.icon;
            }
            if (type) {
              payload.type = type;
            }
            return payload;
          })
        );
        return;
      }
      case 'chartlist':
        this.infoPanel.openChartList(
          (po.content as { id?: string; label?: string }[]).map((entry) => ({
            id: String(entry?.id ?? ''),
            label: String(entry?.label ?? entry?.id ?? '')
          }))
        );
        return;
      case 'alarm':
        if (po.id && po.alarm) {
          this.infoPanel.openAlarm(po.id, po.alarm);
        }
        return;
      case 'ais':
        if (po.vessel) {
          this.infoPanel.openVessel(po.id ?? '', po.vessel, po.isSelf === true);
        }
        return;
      case 'aton':
      case 'meteo':
        if (po.aton) {
          this.infoPanel.openAton(po.id ?? '', po.aton);
        } else if (po.meteo) {
          this.infoPanel.openAton(po.id ?? '', po.meteo);
        }
        return;
      case 'aircraft':
        if (po.aircraft) {
          this.infoPanel.openAircraft(po.id ?? '', po.aircraft);
        }
        return;
      case 'region':
      case 'note':
      case 'route':
      case 'waypoint':
      case 'destination':
        if (Array.isArray(po.resource)) {
          const collection = (
            po.type === 'destination' ? 'waypoints' : `${po.type}s`
          ) as SKResourceType;
          const id = po.resource[0];
          // openWith shows the cached resource immediately; open() fetches
          // the latest from the SignalK server so the description,
          // properties dict, and any plugin-augmented fields (e.g. the
          // ActiveCaptain POI body) are always current. Show cached first
          // so the panel opens with zero perceived latency, then refresh
          // in the background.
          this.infoPanel.openWith(
            collection,
            po.resource as Parameters<typeof this.infoPanel.openWith>[1]
          );
          if (id) {
            void this.infoPanel.open(collection, id);
          }
        }
        return;
      case 'rset':
        if (po.id && po.resource) {
          this.infoPanel.openResourceSet(
            po.id,
            po.title || 'Resource set',
            po.resource as ResourceSet,
            po.readOnly === true
          );
        }
        return;
      default:
        return;
    }
  }

  /** handle selection from the FeatureList popover */
  protected featureListSelection(feature: { id: string; coord: Position }) {
    // trim the draw.features collection to the selected feature.id
    const sf = new Collection();
    this.mapInteract.draw.features.forEach((e: Feature) => {
      if (e.getId() === feature.id) {
        sf.push(e);
      }
    });
    this.mapInteract.draw.features = sf;
    this.formatPopover(feature.id, feature.coord);
  }

  /** handle popover info event */
  protected popoverInfo() {
    const collection = `${this.overlay().type}s` as SKResourceType;
    const overlayId = this.overlay().id;
    if (
      ['notes', 'regions', 'waypoints', 'routes'].includes(collection) &&
      this.app.useInfoPanel() &&
      overlayId !== null
    ) {
      void this.infoPanel.open(collection, overlayId);
    } else {
      const ov = this.overlay();
      this.skres.resourceProperties({
        id: ov.id ?? '',
        type: ov.type ?? ''
      });
    }
  }

  /** handle popover closed event */
  protected popoverClosed() {
    this.overlay.update((current) => {
      return Object.assign({}, current, { show: false });
    });
  }

  private updateCoordsMeta(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startCoords: any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    endCoords: any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any[] | undefined {
    if (!meta) {
      return undefined;
    }
    const mode =
      endCoords.length > startCoords.length
        ? 'ADD'
        : endCoords.length < startCoords.length
          ? 'DELETE'
          : 'MOVE';

    function stringifyCoords(coords: Coordinate[]): string[] {
      return coords.map((c: Coordinate) => {
        return `${c[0]} - ${c[1]}`;
      });
    }

    if (mode === 'MOVE') {
      return meta;
    }
    const startStr = stringifyCoords(startCoords);
    const endStr = stringifyCoords(endCoords);
    if (mode === 'DELETE') {
      for (let i = 0; i < startStr.length; i++) {
        if (!endStr.includes(startStr[i] ?? '')) {
          meta.splice(i, 1);
        }
      }
      return meta;
    } else if (mode === 'ADD') {
      for (let i = 0; i < endStr.length; i++) {
        if (startStr[i] !== endStr[i]) {
          meta.splice(i, 0, { name: '' });
          break;
        }
      }
      return meta;
    } else {
      return meta;
    }
  }

  // ****** MAP control functions *******

  // handle map zoom controls
  protected zoomMap(zoomIn: boolean) {
    if (zoomIn) {
      if (this.app.config.map.zoomLevel < this.app.MAP_ZOOM_EXTENT.max) {
        ++this.app.config.map.zoomLevel;
      }
    } else {
      if (this.app.config.map.zoomLevel > this.app.MAP_ZOOM_EXTENT.min) {
        --this.app.config.map.zoomLevel;
      }
    }
  }

  // orient map heading up / north up
  private rotateMap() {
    if (this.northUp) {
      this.mapRotation.set(0);
    } else {
      this.mapRotation.update(() => 0 - this.dfeat.active.orientation);
    }
  }

  // center map to active vessel position
  private centerVessel() {
    const pos = this.app.calcMapCenter();
    this.mapCenterPositon.update(() => pos);
  }

  /** construct vessel lines for rendering */
  protected drawVesselLines(vesselUpdate = false) {
    const z = this.mapZoomLevel();
    const offset = z < 29 ? (zoomOffsetLevel[Math.floor(z)] ?? 60) : 60;
    const wMax = 10; // max line length

    // update vessel trail
    if (vesselUpdate && this.dfeat.self.position) {
      this.app.addToSelfTrail(this.dfeat.self.position);
    }

    // render laylines
    this.buildLaylines();

    // render cog, heading, twd, awa for focused vessel
    const active = this.dfeat.active;
    const cog = active.vectors.cog ?? [];
    const sog = active.sog || 0;
    const headingLen = this.app.config.vessels.selfLines.heading.length;
    const hl =
      headingLen === -1
        ? (sog > wMax ? wMax : sog) * offset
        : Convert.nauticalMilesToKm(headingLen) * 1000;
    const activePos = active.position;
    const heading: LineString = activePos
      ? [
          activePos,
          GeoUtils.rhumbDestination(activePos, active.orientation, hl)
        ]
      : [];
    this.vesselLines.set({ cog, heading });
  }

  /** calculate vessel & dest laylines & update signals */
  private buildLaylines() {
    const navPos = this.dfeat.navData.position;
    if (
      !this.app.config.vessels.laylines ||
      !Array.isArray(navPos) ||
      typeof navPos[0] !== 'number' ||
      typeof this.app.data.vessels.active.heading !== 'number'
    ) {
      return;
    }
    const twd_deg = Convert.radiansToDegrees(
      this.app.data.vessels.self.wind.direction ?? 0
    );

    const twd_inv = Angle.add(twd_deg, 180);

    const destUpwind =
      Math.abs(
        Angle.difference(this.course.courseData().bearing.value, twd_deg)
      ) < 90;

    // beat angle
    const ba_deg = Convert.radiansToDegrees(
      this.app.data.vessels.self.performance.beatAngle ?? Math.PI / 4
    );

    // gybe angle
    let ga_deg: number | undefined;
    let ga_diff: number | undefined;
    if (typeof this.app.data.vessels.self.performance.gybeAngle === 'number') {
      ga_deg = Convert.radiansToDegrees(
        this.app.data.vessels.self.performance.gybeAngle
      );
      ga_diff = 180 - Math.abs(ga_deg);
    }

    const destInTarget = destUpwind
      ? Math.abs(
          Angle.difference(this.course.courseData().bearing.value, twd_deg)
        ) < ba_deg
      : Math.abs(
          Angle.difference(this.course.courseData().bearing.value, twd_inv)
        ) < (ga_diff ?? 0);

    const dtg =
      this.app.config.units.distance === 'kilometer'
        ? this.course.courseData().dtg * 1000
        : Convert.nauticalMilesToKm(this.course.courseData().dtg * 1000);

    // mark laylines
    let markLines: Position[] = [];
    if (destUpwind) {
      const bapt1 = GeoUtils.destCoordinate(
        navPos,
        Convert.degreesToRadians(Angle.add(twd_inv, ba_deg)),
        dtg
      );
      const bapt2 = GeoUtils.destCoordinate(
        navPos,
        Convert.degreesToRadians(Angle.add(twd_inv, 0 - ba_deg)),
        dtg
      );

      markLines = [bapt1, navPos, bapt2];
    } else if (typeof ga_deg === 'number') {
      const gapt1 = GeoUtils.destCoordinate(
        navPos,
        Convert.degreesToRadians(Angle.add(twd_inv, ga_deg)),
        dtg
      );
      const gapt2 = GeoUtils.destCoordinate(
        navPos,
        Convert.degreesToRadians(Angle.add(twd_inv, 0 - ga_deg)),
        dtg
      );

      markLines = [gapt1, navPos, gapt2];
    }

    this.perfTargetAngle.update(() => markLines);

    // vessel laylines
    if (!destInTarget) {
      return;
    }
    const hbd_deg = Angle.difference(
      twd_deg,
      this.course.courseData().bearing.value
    );
    let ipts: Position | undefined;
    let iptp: Position | undefined;
    const activePos = this.app.data.vessels.active.position;

    if (destUpwind && activePos) {
      // Vector angles
      const C_RAD = Convert.degreesToRadians(ba_deg - hbd_deg);
      const B_RAD = Convert.degreesToRadians(ba_deg + hbd_deg);
      const A_RAD = Math.PI - (B_RAD + C_RAD);
      const b = (dtg * Math.sin(B_RAD)) / Math.sin(A_RAD);
      const c = (dtg * Math.sin(C_RAD)) / Math.sin(A_RAD);
      ipts = GeoUtils.destCoordinate(
        activePos,
        Convert.degreesToRadians(Angle.add(twd_deg, ba_deg)),
        b
      );
      iptp = GeoUtils.destCoordinate(
        activePos,
        Convert.degreesToRadians(Angle.add(twd_deg, 0 - ba_deg)),
        c
      );
    } else if (
      !destUpwind &&
      markLines.length !== 0 &&
      typeof ga_diff === 'number' &&
      activePos
    ) {
      // downwind
      const C_RAD = Convert.degreesToRadians(ga_diff - hbd_deg);
      const B_RAD = Convert.degreesToRadians(ga_diff + hbd_deg);
      const A_RAD = Math.PI - (B_RAD + C_RAD);
      const b = (dtg * Math.sin(B_RAD)) / Math.sin(A_RAD);
      const c = (dtg * Math.sin(C_RAD)) / Math.sin(A_RAD);
      ipts = GeoUtils.destCoordinate(
        activePos,
        Convert.degreesToRadians(Angle.add(twd_deg, ga_diff)),
        b
      );
      iptp = GeoUtils.destCoordinate(
        activePos,
        Convert.degreesToRadians(Angle.add(twd_deg, 0 - ga_diff)),
        c
      );
    }

    const ml1 = markLines[1];
    if (!ipts || !iptp || !activePos || !ml1) {
      return;
    }
    this.perfLaylines.update(() => {
      return {
        port: [
          [iptp as Position, activePos],
          [ipts as Position, activePos]
        ],
        starboard: [
          [ipts as Position, ml1],
          [ml1, iptp as Position]
        ]
      };
    });
  }

  // ********************

  // ** delete selected feature **
  protected deleteFeature(id: string, type: string) {
    switch (type) {
      case 'waypoint':
        void this.skres.deleteWaypoint(id);
        break;
      case 'route':
        void this.skres.deleteRoute(id);
        break;
      case 'note':
        this.skres.deleteNote(id);
        break;
      case 'region':
        void this.skres.deleteRegion(id);
        break;
    }
  }

  // Template proxies that absorb IPopover's nullable id/type so the
  // strict TCB can call the string-typed downstream APIs safely.
  public deleteOverlay(ov: IPopover) {
    if (ov.id !== null && ov.type !== null) {
      this.deleteFeature(ov.id, ov.type);
    }
  }
  public itemInfoFromOverlay(ov: IPopover) {
    if (ov.id !== null && ov.type !== null) {
      this.itemInfo(ov.id, ov.type, ov.isSelf ?? false);
    }
  }
  public addNoteFromOverlay(ov: IPopover) {
    if (ov.id !== null && ov.type !== null) {
      void this.skres.showNoteEditor({
        type: ov.type,
        href: { id: ov.id, exists: true }
      });
    }
  }
  public showRelatedNotesFromOverlay(ov: IPopover) {
    if (ov.id !== null && ov.type !== null) {
      void this.skres.showRelatedNotes(ov.id, ov.type, ov.readOnly);
    }
  }

  // ** activate route / waypoint
  protected setActiveFeature() {
    const overlayId = this.overlay().id;
    if (overlayId === null) {
      return;
    }
    if (this.overlay().type === 'waypoint') {
      this.course.navigateToWaypoint(overlayId);
    } else {
      this.activate.emit(overlayId);
    }
  }

  // ** deactivate route / waypoint
  protected clearActiveFeature() {
    const overlayId = this.overlay().id;
    if (overlayId !== null) {
      this.deactivate.emit(overlayId);
    }
  }

  // ** emit info event **
  protected itemInfo(id: string, type: string, isSelf = false) {
    if (type === 'ais' && isSelf) {
      this.info.emit({ id: id, type: 'self' });
    } else {
      this.info.emit({ id: id, type: type });
    }
  }

  protected setActiveVessel(id: string | null = null) {
    this.focusVessel.emit(id);
  }

  // ******** Interactions: DRAW / EDIT / MEASURE ************

  /** Apply the selected Interaction mode */
  private applyInteractionMode(mode: INTERACTION_MODE, value: boolean) {
    this.overlay.update((current) => {
      return Object.assign({}, current, { show: false });
    });
    if (mode === INTERACTION_MODE.MEASURE) {
      this.mapInteract.draw.style = value
        ? this.mapInteract.measureGeometryType === 'Circle'
          ? drawStyles.radius
          : drawStyles.measure
        : drawStyles.default;
    }
    if (mode === INTERACTION_MODE.DRAW) {
      this.mapInteract.draw.style =
        this.mapInteract.draw.resourceType === 'route'
          ? drawStyles.route
          : this.mapInteract.draw.resourceType === 'region'
            ? drawStyles.region
            : drawStyles.default;
    }
  }

  // ********************************************************

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isCoordsArray(ca: any): boolean {
    if (Array.isArray(ca)) {
      const first = ca[0];
      return Array.isArray(first) && typeof first[0] === 'number';
    } else {
      return false;
    }
  }

  private transformCoordsArray(ca: Position[]): Position[] {
    return ca.map((i) => toLonLat(i as [number, number]) as Position);
  }

  // apply default chart style (vectortile)
  applyStyle() {
    return new Style({
      fill: new Fill({
        color: '#e0d10e'
      }),
      stroke: new Stroke({
        color: '#444',
        width: 1
      })
    });
  }

  // ** called by onMapMoveEnd() to render features within map extent
  private renderMapContents(zoomChanged = false) {
    if (this.shouldFetchNotes(zoomChanged)) {
      void this.skres.refreshNotes();
      this.app.debug(`fetching Notes...`);
    }
    if (this.shouldFetchResourceSets(zoomChanged)) {
      this.app.debug(`fetching ResourceSets...`);
      void this.skresOther.refreshResourceSetsInBounds();
    }
  }

  // returns true when map center has moved a distance > (threshold / 2)
  private mapMoveThresholdExceeded(threshold: number): boolean {
    if (!this.app.data.lastGet) {
      this.app.data.lastGet = this.app.config.map.center;
      return true;
    }
    // ** calc distance from new map center to lastGet
    const d = GeoUtils.distanceTo(
      this.app.data.lastGet,
      this.app.config.map.center
    );
    this.app.debug(`distance map moved: ${d}`);
    // ** if d is more than half the getRadius
    const cr =
      this.app.config.units.distance === 'kilometer'
        ? threshold * 1000
        : Convert.nauticalMilesToKm(threshold) * 1000;

    this.app.debug(`mapMoveThresholdExceeded: ${d >= cr / 2}`);
    if (d >= cr / 2) {
      this.app.data.lastGet = this.app.config.map.center;
      return true;
    } else {
      return false;
    }
  }

  // ** returns true if skresOther.refreshResourceSetsInBounds() should be called
  private shouldFetchResourceSets(zoomChanged: boolean) {
    if (
      this.app.config.resources.fetchRadius !== 0 &&
      this.app.config.resources.fetchFilter
    ) {
      if (!this.skresOther.anyResourceSetSelection()) {
        return false;
      }
      if (zoomChanged) {
        return true;
      }
      return this.mapMoveThresholdExceeded(50);
    } else {
      return false;
    }
  }

  /**
   * @description Determine if Notes should be fetched from the server.
   * @param zoomChanged When true signifies that zoom level has changed.
   * @returns true if skres.refreshNotes() should be called
   */
  private shouldFetchNotes(zoomChanged: boolean) {
    this.showNoteslayer.update(
      () =>
        this.app.config.ui.showNotes &&
        this.app.config.map.zoomLevel >= this.app.config.resources.notes.minZoom
    );

    this.app.debug(`lastGet: ${JSON.stringify(this.app.data.lastGet)}`);
    this.app.debug(`getRadius: ${this.app.config.resources.notes.getRadius}`);

    if (zoomChanged) {
      if (this.mapZoomLevel() < this.app.config.resources.notes.minZoom) {
        return false;
      } else {
        return true;
      }
    }
    return this.mapMoveThresholdExceeded(
      this.app.config.resources.notes.getRadius
    );
  }
}
