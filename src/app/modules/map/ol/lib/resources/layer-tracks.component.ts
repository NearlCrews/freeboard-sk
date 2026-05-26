import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Text, Stroke } from 'ol/style';
import { MultiLineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { SKTrack } from 'src/app/modules';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBTracks } from 'src/app/types';

// Shared stroke for the default track style; setTextLabel below clones the
// Text fill out of a per-feature label fill cache.
const DEFAULT_TRACK_STROKE = new Stroke({
  color: 'rgb(146,11,153)',
  width: 2,
  lineDash: [5, 5]
});

// ** Freeboard Track resources collection format **
@Component({
  selector: 'ol-map > fb-tracks',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class TrackLayerComponent extends FBFeatureLayerComponent {
  @Input() tracks: FBTracks = [];
  @Input() trackStyles?: Record<string, Style>;

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['track'];
    this.parseTracks(this.tracks);
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    const tracksChange = changes['tracks'];
    if (this.source && tracksChange) {
      this.source.clear();
      this.parseTracks(tracksChange.currentValue);
    }
  }

  parseTracks(tracks: FBTracks = this.tracks) {
    const fa: Feature[] = [];
    for (const t of tracks) {
      const f = new Feature({
        geometry: new MultiLineString(
          this.parseCoordinates(t[1].feature.geometry.coordinates)
        ),
        name: t[1].name
      });
      f.setId('track.' + t[0]);
      f.setStyle(this.buildStyle(t[1]));
      fa.push(f);
    }
    this.source.addFeatures(fa);
  }

  // build track style
  buildStyle(trk: SKTrack): Style {
    const props = trk.feature.properties ?? {};
    const skType = (props as Record<string, unknown>)['skType'] as
      | string
      | undefined;
    const name = (props as Record<string, unknown>)['name'] as
      | string
      | undefined;
    if (typeof this.trackStyles !== 'undefined') {
      if (skType && this.trackStyles[skType]) {
        return this.setTextLabel(this.trackStyles[skType], name ?? '');
      } else {
        return this.setTextLabel(
          this.trackStyles['default'] ?? new Style(),
          name ?? ''
        );
      }
    } else {
      const layerProps = this.layerProperties();
      if (layerProps?.['style']) {
        return this.setTextLabel(layerProps['style'] as Style, name ?? '');
      }
      // default styles
      const s = new Style({
        stroke: DEFAULT_TRACK_STROKE,
        text: new Text({ text: '', textAlign: 'center' })
      });
      return this.setTextLabel(s, name ?? '');
    }
  }

  // ** mapify and transform MultiLineString coordinates
  parseCoordinates(mls: [number, number, number?][][]) {
    return fromLonLatArray(
      mls.map((line) => mapifyCoords(line as [number, number][]))
    );
  }
}
