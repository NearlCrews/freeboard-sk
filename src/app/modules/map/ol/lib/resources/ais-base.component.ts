import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { Style } from 'ol/style';
import { MapComponent } from '../map.component';
import { SKAircraft, SKAtoN, SKSaR, SKVessel, SKMeteo } from 'src/app/modules';
import { FBFeatureLayerComponent } from '../sk-feature.component';

export type SKTarget = SKVessel | SKAircraft | SKAtoN | SKSaR | SKMeteo;

// ** Signal K AIS Target Base Compnent  **
@Component({
  selector: 'ol-map > sk-ais-target-base',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AISBaseLayerComponent
  extends FBFeatureLayerComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() targets = new Map<string, SKTarget>();
  @Input() targetContext = ''; // e.g. 'vessels', 'atons', 'aircraft', 'meteo'
  @Input() targetStyles?: Record<string, Style>;
  @Input() focusId?: string;
  @Input() inactiveTime = 180000; // in ms (3 mins)
  @Input() filterByShipType?: boolean;
  @Input() filterShipTypes?: number[];
  @Input() filterIds?: string[];
  @Input() updateIds: string[] = [];
  @Input() staleIds: string[] = [];
  @Input() removeIds: string[] = [];

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
    this.labelPrefixes = [];
  }

  override ngOnInit() {
    super.ngOnInit();
    this.reloadTargets();
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.layer) {
      const keys = Object.keys(changes);
      const targetsChange = changes['targets'];
      const removeIdsChange = changes['removeIds'];
      const updateIdsChange = changes['updateIds'];
      const staleIdsChange = changes['staleIds'];
      const targetStylesChange = changes['targetStyles'];
      if (
        (targetsChange && targetsChange.previousValue?.size === 0) ||
        keys.includes('filterShipTypes') ||
        keys.includes('filterByShipType')
      ) {
        this.reloadTargets();
      } else {
        if (removeIdsChange) {
          this.removeTargetIds(removeIdsChange.currentValue);
        }
        if (updateIdsChange) {
          this.updateTargetIds(updateIdsChange.currentValue);
        }
        if (staleIdsChange) {
          this.updateTargetIds(staleIdsChange.currentValue, true);
        }
        if (
          (targetStylesChange && !targetStylesChange.firstChange) ||
          keys.some((k) => ['focusId', 'filterIds', 'inactiveTime'].includes(k))
        ) {
          this.updateTargetIds(this.extractKeys(this.targets));
        }
      }
    }
  }

  /** Extract target ids
   * @param m Map object containing AIS targets of targetContext
   * @returns array of target ids
   */
  protected extractKeys(m: Map<string, SKTarget>): string[] {
    const keys: string[] = [];
    for (const k of m.keys()) {
      if (k.includes(this.targetContext)) {
        keys.push(k);
      }
    }
    return keys;
  }

  /** Determine if target with id should be rendered
   * @params id target identifier
   * @returns true if target should be rendered
   */
  protected okToRenderTarget(id: string): boolean {
    // IMO only
    const checkImo = (id: string) => {
      const imo =
        Array.isArray(this.filterShipTypes) &&
        this.filterShipTypes.includes(-999);
      if (imo) {
        const t = this.targets.get(id) as SKVessel | undefined;
        if (t && 'imo' in t.registrations) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    };

    if (this.filterByShipType && Array.isArray(this.filterShipTypes)) {
      const typeId = this.targets.get(id)?.type?.id;
      if (typeof typeId !== 'number') {
        return false;
      }
      const st = Math.floor(typeId / 10) * 10;
      return this.filterShipTypes.includes(st) && checkImo(id);
    }
    if (!this.filterIds) {
      return checkImo(id);
    }
    if (Array.isArray(this.filterIds)) {
      return this.filterIds.includes(id) && checkImo(id);
    } else {
      return checkImo(id);
    }
  }

  /** Determine if target is stale
   * @params target AIS target
   * @returns true if target is stale
   */
  protected isStale(target: SKTarget): boolean {
    if (isNaN(this.inactiveTime)) {
      return false;
    }
    const now = Date.now();
    return target.lastUpdated.valueOf() < now - this.inactiveTime;
  }

  /** Return a feature label */
  protected buildLabel(target: SKTarget) {
    return (
      target.name ??
      target.callsignVhf ??
      target.callsignHf ??
      target.mmsi ??
      ''
    );
  }

  // reload all Features from this.targets
  private reloadTargets() {
    if (!this.targets || !this.source) {
      return;
    }
    this.source.clear();
    this.onReloadTargets();
  }

  protected onReloadTargets() {
    // overloadable
  }

  // update Features with supplied ids
  private updateTargetIds(ids: string[], areStale = false) {
    if (!this.source || !Array.isArray(ids)) {
      return;
    }
    this.onUpdateTargets(ids, areStale);
  }

  protected onUpdateTargets(ids: string[], areStale: boolean) {
    // overloadable
  }

  // remove target features
  private removeTargetIds(ids: string[]) {
    if (!this.source || !Array.isArray(ids)) {
      return;
    }
    this.onRemoveTargets(ids);
  }

  protected onRemoveTargets(ids: string[]) {
    // overloadable
  }
}
