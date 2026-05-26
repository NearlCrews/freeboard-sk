import { ChangeDetectorRef, Directive, Input, OnInit } from '@angular/core';
import {
  Attribution,
  Control,
  FullScreen,
  Rotate,
  ScaleLine,
  Zoom,
  ZoomSlider,
  ZoomToExtent
} from 'ol/control';
import type { Map as OLMap } from 'ol';
import { MapComponent } from './map.component';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ControlCtor = new (options?: any) => Control;

interface ControlConfig {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any;
}

@Directive({
  selector: 'ol-map > [olControls]',
  standalone: false
})
export class ControlsDirective implements OnInit {
  private controls: ControlConfig[] = [];
  private readonly controlList: Record<string, ControlCtor> = {
    attribution: Attribution,
    fullscreen: FullScreen,
    rotate: Rotate,
    scaleline: ScaleLine,
    zoom: Zoom,
    zoomslider: ZoomSlider,
    zoomtoextent: ZoomToExtent
  };

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  @Input()
  set olControls(value: ControlConfig[]) {
    this.controls = value;
    this.setControls();
  }

  ngOnInit() {
    this.setControls();
  }

  setControls() {
    const map = this.mapComponent.getMap();
    if (undefined !== map && map !== null) {
      map.getControls().clear();
      if (!this.controls || this.controls.length < 0) {
        return;
      }
      for (const config of this.controls) {
        this.addControl(map, config);
      }
      this.changeDetectorRef.detectChanges();
    }
  }

  private addControl(map: OLMap, controlConfig: ControlConfig) {
    const Ctor = this.controlList[controlConfig.name];
    if (!Ctor) {
      console.warn(`Unknown control ${controlConfig.name}`);
      return;
    }
    const newControl = new Ctor(controlConfig.options);
    map.addControl(newControl);
  }
}
