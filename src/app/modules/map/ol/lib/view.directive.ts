import {
  AfterViewInit,
  ChangeDetectorRef,
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  output,
  SimpleChanges
} from '@angular/core';
import View from 'ol/View';
import type { ObjectEvent } from 'ol/Object';
import { toLonLat, fromLonLat, ProjectionLike } from 'ol/proj';
import { Coordinate, Extent } from './models';
import { MapComponent } from './map.component';

const animateDuration = 500;

@Directive({
  selector: 'ol-map > [olView]',
  standalone: false
})
export class ViewDirective
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  private timerCenterId: ReturnType<typeof setTimeout> | undefined;
  private timerZoomId: ReturnType<typeof setTimeout> | undefined;
  private timerRotationId: ReturnType<typeof setTimeout> | undefined;
  private view!: View;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private viewProperties: Record<string, any> = {};

  readonly centerChange = output<Coordinate>();
  readonly rotationChange = output<number>();
  readonly zoomChange = output<number>();

  @Input() enableAnimation = false;
  @Input() constrainRotation?: boolean | number;
  @Input() constrainResolution?: boolean;
  @Input() enableRotation?: boolean;
  @Input() extent?: Extent;
  @Input() maxResolution?: number;
  @Input() minResolution?: number;
  @Input() maxZoom?: number;
  @Input() minZoom?: number;
  @Input() multiWorld?: boolean;
  @Input() resolution?: number;
  @Input() resolutions?: number[];
  @Input() rotation?: number;
  @Input() zoom?: number;
  @Input() zoomFactor?: number;
  @Input() center?: Coordinate;
  @Input() projection?: ProjectionLike;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.view = new View(this.viewProperties);
    this.view.setRotation(this.rotation ?? 0);
    const map = this.mapComponent.getMap();
    if (map) {
      map.setView(this.view);
      map.updateSize();
    }
  }

  ngAfterViewInit() {
    const map = this.mapComponent.getMap();
    if (map) {
      // register view events
      this.view.on('change:center', this.emitCenterChange);
      this.view.on('change:resolution', this.emitZoomChange);
      this.view.on('change:rotation', this.emitRotationChange);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const properties: Record<string, any> = {};

    for (const key in changes) {
      const change = changes[key];
      if (!change) continue;
      if (key === 'zoom') {
        if (this.view) {
          if (this.enableAnimation) {
            this.view.animate({
              zoom: change.currentValue,
              duration: animateDuration
            });
          } else {
            this.view.setZoom(change.currentValue);
          }
        } else {
          properties[key] = change.currentValue;
        }
      } else if (key === 'center') {
        if (this.view) {
          if (this.enableAnimation) {
            this.view.animate({
              center: change.currentValue,
              duration: animateDuration
            });
          } else {
            this.view.setCenter(fromLonLat(change.currentValue));
          }
        } else {
          properties[key] = fromLonLat(change.currentValue);
        }
      } else if (key === 'minZoom') {
        if (this.view) {
          this.view.setMinZoom(change.currentValue);
        } else {
          properties[key] = change.currentValue;
        }
      } else if (key === 'maxZoom') {
        if (this.view) {
          this.view.setMaxZoom(change.currentValue);
        } else {
          properties[key] = change.currentValue;
        }
      } else {
        properties[key] = change.currentValue;
      }
    }
    this.viewProperties = properties;
    if (this.view) {
      this.view.setProperties(this.viewProperties, false);
      this.view.setRotation(this.rotation ?? 0);
    }
  }

  ngOnDestroy() {
    if (!this.view) {
      return;
    }
    this.view.un('change:center', this.emitCenterChange);
    this.view.un('change:resolution', this.emitZoomChange);
    this.view.un('change:rotation', this.emitRotationChange);
  }

  getView(): View {
    return this.view;
  }

  // Only arrow function works with addEventListener
  private emitCenterChange = (_e: ObjectEvent) => {
    clearTimeout(this.timerCenterId);
    this.timerCenterId = setTimeout(() => {
      const center = this.view.getCenter();
      if (!center) return;
      this.centerChange.emit(toLonLat(center));
    }, animateDuration + 10);
  };

  private emitZoomChange = (_e: ObjectEvent) => {
    clearTimeout(this.timerZoomId);
    this.timerZoomId = setTimeout(() => {
      const zoom = this.view.getZoom();
      if (zoom === undefined) return;
      this.zoomChange.emit(zoom);
    }, animateDuration + 10);
  };

  private emitRotationChange = (e: ObjectEvent) => {
    clearTimeout(this.timerRotationId);
    this.timerRotationId = setTimeout(
      () => this.rotationChange.emit(e.target.get(e.key) as number),
      animateDuration + 10
    );
  };
}
