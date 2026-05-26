import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  OnChanges,
  OnInit,
  SimpleChanges,
  ChangeDetectorRef,
  OnDestroy,
  inject
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Coordinate } from '../models';
import { BehaviorSubject, AsyncSubject } from 'rxjs';
import ImageLayer from 'ol/layer/Image';
import type ImageSource from 'ol/source/Image';
import { RadarRenderService } from './radar-render.service';
import { ShipState } from './ship-state.model';
import { MapComponent } from '../map.component';

// ** Freeboard Radar component **
@Component({
  selector: 'ol-map > fb-radar',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RadarComponent implements OnInit, OnChanges, OnDestroy {
  @Output() layerReady = new AsyncSubject<Layer>();
  @Input() position?: Coordinate;
  @Input() heading = 0;
  @Input() mapZoom?: number;
  @Input() zIndex?: number;
  @Input() visible?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: Record<string, any>;

  private state: ShipState = { location: [0, 0], heading: 0 };
  private subject = new BehaviorSubject<ShipState>({
    location: [0, 0],
    heading: 0
  });
  protected layer: ImageLayer<ImageSource> | null = null;

  private radarRenderService = inject(RadarRenderService);
  protected mapComponent = inject(MapComponent);
  protected changeDetectorRef = inject(ChangeDetectorRef);

  constructor() {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    const layer = new ImageLayer(
      Object.assign(this, { ...this.layerProperties })
    );
    this.layer = layer;
    const map = this.mapComponent.getMap();
    if (map) {
      map.addLayer(layer);
      map.render();
      this.layerReady.next(layer);
      this.layerReady.complete();
    }

    this.radarRenderService.connect().then(() => {
      const radars = this.radarRenderService.getRadars();
      const firstKey = radars.keys().next().value;
      if (firstKey === undefined) return;
      const radar = radars.get(firstKey);
      if (radar && this.layer) {
        this.layer.setSource(
          this.radarRenderService.createRadarSource(radar, this.subject)
        );
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.layer) {
      const positionChange = changes['position'];
      const headingChange = changes['heading'];
      if (positionChange || headingChange) {
        if (positionChange) {
          const position = positionChange.currentValue;
          this.state.location = position;
        }
        if (headingChange) {
          this.state.heading = headingChange.currentValue * (180 / Math.PI);
        }
        this.subject.next(this.state);
      }
    }
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
      this.layer = null;
    }
    this.radarRenderService.disconnect();
  }
}
