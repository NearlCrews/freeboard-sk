import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges,
  inject
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Stroke } from 'ol/style';
import { MultiLineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AISBaseLayerComponent } from './ais-base.component';
import { MapThemeService } from '../theme';

// ** Signal K AIS targets track  **
@Component({
  selector: 'ol-map > ais-targets-track',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AISTargetsTrackLayerComponent extends AISBaseLayerComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() tracks = new Map<string, any>();
  @Input() tracksMinZoom = 10;
  @Input() override mapZoom = 10;
  @Input() showTracks = true;

  private readonly mapTheme = inject(MapThemeService);

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.reloadTracks();
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.layer) {
      const tracksChange = changes['tracks'];
      const tracksMinZoomChange = changes['tracksMinZoom'];
      const mapZoomChange = changes['mapZoom'];
      if (tracksChange && tracksChange.previousValue?.size === 0) {
        this.reloadTracks();
      } else {
        if (tracksMinZoomChange) {
          if (typeof this.mapZoom !== 'undefined') {
            this.reloadTracks();
          }
        }
        if (mapZoomChange) {
          if (typeof this.tracksMinZoom !== 'undefined') {
            if (
              mapZoomChange.currentValue >= this.tracksMinZoom &&
              mapZoomChange.previousValue < this.tracksMinZoom
            ) {
              this.reloadTracks();
            } else if (
              mapZoomChange.currentValue < this.tracksMinZoom &&
              mapZoomChange.previousValue >= this.tracksMinZoom
            ) {
              this.source.clear();
            }
          }
        }
      }
    }
  }

  okToRenderTracks() {
    return this.mapZoom >= this.tracksMinZoom;
  }

  reloadTracks() {
    if (!this.tracks || !this.source) {
      return;
    }
    this.source.clear();
    if (this.okToRenderTracks()) {
      this.onUpdateTargets(this.extractKeys(this.tracks));
    }
  }

  // update track features
  override onUpdateTargets(ids: string[]) {
    if (this.okToRenderTracks()) {
      ids.forEach((id: string) => {
        if (id.includes(this.targetContext)) {
          const f = this.source.getFeatureById('track-' + id) as Feature | null;
          if (this.okToRenderTarget(id)) {
            if (this.tracks.has(id)) {
              const track = this.tracks.get(id);
              if (f) {
                f.setGeometry(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  new MultiLineString(this.parseCoordinates(track) as any)
                );
                f.setStyle(this.buildStyle(id));
              } else {
                this.addTrackWithId(id);
              }
            }
          } else if (f) {
            this.source.removeFeature(f);
          }
        }
      });
    }
  }

  // remove track features
  override onRemoveTargets(ids: string[]) {
    ids.forEach((w) => {
      const f = this.source.getFeatureById('track-' + w) as Feature | null;
      if (f) {
        this.source.removeFeature(f);
      }
    });
  }

  // add new track feature
  addTrackWithId(id: string) {
    if (!id.includes(this.targetContext) || !this.tracks.has(id)) {
      return;
    }
    const track = this.tracks.get(id);
    const f = new Feature({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      geometry: new MultiLineString(this.parseCoordinates(track) as any)
    });
    f.setId('track-' + id);
    f.setStyle(this.buildStyle(id));
    this.source.addFeature(f);
  }

  // build track style
  buildStyle(id: string): Style {
    const baseColor = id.includes('aircraft')
      ? 'rgb(0, 0, 255)'
      : this.mapTheme.palette().trailAis;
    const color = this.showTracks ? baseColor : 'transparent';
    if (this.layerProperties?.['style']) {
      const cs = (this.layerProperties['style'] as Style).clone();
      const ls = cs.getStroke();
      if (ls) {
        ls.setColor(color);
        cs.setStroke(ls);
      }
      return cs;
    } else {
      return new Style({
        stroke: new Stroke({
          width: 1,
          color: color,
          lineDash: [2, 2]
        })
      });
    }
  }

  // ** mapify and transform MultiLineString coordinates
  parseCoordinates(trk: [number, number][][][]) {
    // ** handle dateline crossing **
    // fromLonLatArray overloads cover up to Coordinate[][]; we feed a
    // MultiPolygon-shape (3 levels) so the outer map projects each
    // MultiLineString separately.
    return trk.map((mls) => fromLonLatArray(mls.map(mapifyCoords)));
  }
}
