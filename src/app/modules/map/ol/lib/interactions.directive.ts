import { ChangeDetectorRef, Directive, Input, OnInit } from '@angular/core';
import {
  DoubleClickZoom,
  DragPan,
  DragRotate,
  DragZoom,
  Interaction,
  KeyboardPan,
  KeyboardZoom,
  MouseWheelZoom,
  PinchZoom
} from 'ol/interaction';
import type { Map as OLMap } from 'ol';
import { MapComponent } from './map.component';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InteractionCtor = new (options?: any) => Interaction;

interface InteractionConfig {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any;
}

@Directive({
  selector: 'ol-map > [olInteractions]',
  standalone: false
})
export class InteractionsDirective implements OnInit {
  private interactions: InteractionConfig[] = [];
  private readonly interactionList: Record<string, InteractionCtor> = {
    dragpan: DragPan,
    dragrotate: DragRotate,
    dragzoom: DragZoom,
    doubleclickzoom: DoubleClickZoom,
    keyboardpan: KeyboardPan,
    keyboardzoom: KeyboardZoom,
    mousewheelzoom: MouseWheelZoom,
    pinchzoom: PinchZoom
  };

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  @Input()
  set olInteractions(value: InteractionConfig[]) {
    this.interactions = value;
    this.setInteractions();
  }

  ngOnInit() {
    this.setInteractions();
  }

  setInteractions() {
    const map = this.mapComponent.getMap();
    if (undefined !== map && map !== null) {
      map.getInteractions().clear();
      if (!this.interactions || this.interactions.length < 0) return;
      for (const config of this.interactions) {
        this.addInteraction(map, config);
      }
      this.changeDetectorRef.detectChanges();
    }
  }

  private addInteraction(map: OLMap, controlConfig: InteractionConfig) {
    const Ctor = this.interactionList[controlConfig.name];
    if (!Ctor) {
      console.error(`Unknown interaction ${controlConfig.name}`);
      return;
    }
    const newInteraction = new Ctor(controlConfig.options);
    map.addInteraction(newInteraction);
  }
}
