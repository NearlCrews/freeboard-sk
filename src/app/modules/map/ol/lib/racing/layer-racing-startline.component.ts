import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Stroke, Fill, Circle, RegularShape } from 'ol/style';
import { LineString, Point } from 'ol/geom';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { MapThemeService } from '../theme/map-theme.service';

@Component({
  selector: 'ol-map > racing-start-line',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RacingStartLineLayerComponent
  extends FBFeatureLayerComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() startLine?: LineString;
  @Input() racecourseStyles?: Record<string, Style | Style[]>;

  private readonly mapTheme = inject(MapThemeService);

  constructor(
    protected override changeDetectorRef: ChangeDetectorRef,
    protected override mapComponent: MapComponent
  ) {
    super(mapComponent, changeDetectorRef);
    this.labelPrefixes = ['race-startline'];
  }

  override ngOnInit() {
    super.ngOnInit();
    this.parseCourse();
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (['startLine'].some((k) => k in changes)) {
      this.parseCourse();
    }
  }

  parseCourse() {
    if (!this.source) {
      return;
    }
    this.source.clear();
    const fa: Feature[] = [];
    if (Array.isArray(this.startLine) && this.startLine.length === 2) {
      const sl = new Feature({
        geometry: new LineString(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fromLonLatArray(mapifyCoords(this.startLine as any)) as any
        ),
        name: 'start'
      });
      sl.setId('race-start-line');
      sl.setStyle(this.buildStyle(sl));
      fa.push(sl);
      this.source.addFeatures(fa);
      this.updateLabels();
    }
  }

  // Style function
  buildStyle(feature: Feature): Style | Style[] {
    const geometry = feature.getGeometry() as LineString;
    const styles: Style[] = [];

    if (typeof this.racecourseStyles === 'undefined') {
      const lpStyle = this.layerProperties()?.['style'] as
        | Style
        | Style[]
        | undefined;
      if (lpStyle) {
        return lpStyle;
      }
      return styles;
    }

    // line style
    const startLineStyle = this.racecourseStyles['startLine'];
    if (!startLineStyle) {
      return styles;
    }
    const s = Array.isArray(startLineStyle)
      ? startLineStyle[startLineStyle.length - 1]
      : startLineStyle;
    if (!s) {
      return styles;
    }
    const stroke = s.getStroke();
    const strokeWidth = stroke?.getWidth() ?? 1;
    const bgWidth = strokeWidth + 1;
    const bgColor = 'white';
    const ptFill = new Fill({
      color: stroke?.getColor() ?? this.mapTheme.palette().mapLabel
    });

    // background
    styles.push(
      new Style({
        stroke: new Stroke({
          color: bgColor,
          width: bgWidth
        })
      })
    );
    // line
    if (Array.isArray(startLineStyle)) {
      styles.push(...startLineStyle);
    } else {
      styles.push(startLineStyle);
    }

    // point styles
    geometry.forEachSegment((start, end) => {
      styles.push(
        new Style({
          geometry: new Point(start),
          image: new RegularShape({
            radius: 4,
            stroke: new Stroke({
              width: 1,
              color: bgColor
            }),
            fill: ptFill,
            points: 4,
            angle: Math.PI / 4
          })
        })
      );
      styles.push(
        new Style({
          geometry: new Point(end),
          image: new Circle({
            radius: 3,
            stroke: new Stroke({
              width: 1,
              color: bgColor
            }),
            fill: ptFill
          })
        })
      );
    });
    return styles;
  }
}
