import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  output,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { Map } from 'ol';
import { DragBox } from 'ol/interaction';
import { DragBoxEvent } from 'ol/interaction/DragBox';
import { MapComponent } from '../map.component';

@Component({
  selector: 'ol-map > ol-dragbox',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class InteractionDragBoxComponent implements AfterViewInit, OnDestroy {
  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  readonly change = output<DragBoxEvent>();
  readonly boxStart = output<DragBoxEvent>();
  readonly boxEnd = output<DragBoxEvent>();
  readonly boxDrag = output<DragBoxEvent>();
  readonly boxCancel = output<DragBoxEvent>();

  private map: Map | null = null;
  private interaction: DragBox | null = null;

  ngAfterViewInit() {
    this.map = this.mapComponent.getMap();
    this.addDragBoxInteraction();
  }

  ngOnDestroy() {
    if (this.map && this.interaction) {
      this.map.removeInteraction(this.interaction);
      (
        this.interaction as unknown as { un: (a: string, b: unknown) => void }
      ).un('change', this.emitChangeEvent);
      (
        this.interaction as unknown as { un: (a: string, b: unknown) => void }
      ).un('boxstart', this.emitBoxStartEvent);
      (
        this.interaction as unknown as { un: (a: string, b: unknown) => void }
      ).un('boxend', this.emitBoxEndEvent);
      (
        this.interaction as unknown as { un: (a: string, b: unknown) => void }
      ).un('boxdrag', this.emitBoxDragEvent);
      (
        this.interaction as unknown as { un: (a: string, b: unknown) => void }
      ).un('boxcancel', this.emitBoxCancelEvent);
      this.interaction = null;
    }
  }

  addDragBoxInteraction() {
    const map = this.map;
    if (undefined !== map && map !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opt: any = {};
      const interaction = new DragBox(opt);
      this.interaction = interaction;
      (interaction as unknown as { on: (a: string, b: unknown) => void }).on(
        'change',
        this.emitChangeEvent
      );
      (interaction as unknown as { on: (a: string, b: unknown) => void }).on(
        'boxstart',
        this.emitBoxStartEvent
      );
      (interaction as unknown as { on: (a: string, b: unknown) => void }).on(
        'boxend',
        this.emitBoxEndEvent
      );
      (interaction as unknown as { on: (a: string, b: unknown) => void }).on(
        'boxdrag',
        this.emitBoxDragEvent
      );
      (interaction as unknown as { on: (a: string, b: unknown) => void }).on(
        'boxcancel',
        this.emitBoxCancelEvent
      );
      map.addInteraction(interaction);
      this.changeDetectorRef.detectChanges();
    }
  }

  // ** emit events
  private emitChangeEvent = (event: DragBoxEvent) => this.change.emit(event);
  private emitBoxStartEvent = (event: DragBoxEvent) =>
    this.boxStart.emit(event);
  private emitBoxEndEvent = (event: DragBoxEvent) => this.boxEnd.emit(event);
  private emitBoxDragEvent = (event: DragBoxEvent) => this.boxDrag.emit(event);
  private emitBoxCancelEvent = (event: DragBoxEvent) =>
    this.boxCancel.emit(event);
}
