import {
  Component,
  ChangeDetectionStrategy,
  output,
  input,
  inject,
  OnInit
} from '@angular/core';

import { ScrollingModule } from '@angular/cdk/scrolling';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardHeaderComponent,
  FbCardContentComponent,
  FbCardActionsComponent,
  FbCheckboxComponent,
  FbIconComponent,
  FbProgressBarComponent,
  FbSearchInputComponent,
  FbSwitchRowComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';

import { AppFacade } from 'src/app/app.facade';
import { HttpErrorResponse } from '@angular/common/http';
import { SKResourceService } from 'src/app/modules';
import { FBVessel, FBVessels, Position } from 'src/app/types';
import { ResourceListBase } from '../resource-list-baseclass';
import { getAisIcon } from 'src/app/modules/icons';

//** AIS Dialog **
@Component({
  selector: 'ais-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aislist.html',
  styleUrls: ['../resourcelist.css'],
  imports: [
    FbButtonComponent,
    ScrollingModule,
    FbCardComponent,
    FbCardHeaderComponent,
    FbCardContentComponent,
    FbCardActionsComponent,
    FbCheckboxComponent,
    FbIconComponent,
    FbProgressBarComponent,
    FbSwitchRowComponent,
    FbSearchInputComponent,
    FbTooltipDirective
  ]
})
export class AISListComponent extends ResourceListBase implements OnInit {
  focusId = input<string | undefined>(undefined);
  closed = output<void>();
  properties = output<string>();
  focusVessel = output<string | undefined>();
  pan = output<{ center: Position; zoomLevel: number }>();

  aisAvailable: FBVessel[] = [];
  onlyIMO = false;
  filterList: FBVessel[] = [];
  override filterText = '';
  override someSel = false;
  override allSel = false;

  shipTypes = [
    {
      id: 10,
      description: 'Unspecified',
      selected: false,
      icon: getAisIcon(10).svgIcon
    },
    {
      id: 20,
      description: 'Wing in Ground',
      selected: false,
      icon: getAisIcon(20).svgIcon
    },
    {
      id: 30,
      description: 'Pleasure',
      selected: false,
      icon: getAisIcon(30).svgIcon
    },
    {
      id: 40,
      description: 'High Speed',
      selected: false,
      icon: getAisIcon(40).svgIcon
    },
    {
      id: 50,
      description: 'Special',
      selected: false,
      icon: getAisIcon(50).svgIcon
    },
    {
      id: 60,
      description: 'Passenger',
      selected: false,
      icon: getAisIcon(60).svgIcon
    },
    {
      id: 70,
      description: 'Cargo',
      selected: false,
      icon: getAisIcon(70).svgIcon
    },
    {
      id: 80,
      description: 'Tanker',
      selected: false,
      icon: getAisIcon(80).svgIcon
    },
    {
      id: 90,
      description: 'Other',
      selected: false,
      icon: getAisIcon(90).svgIcon
    }
  ];

  protected override fullList: FBVessels = [];

  /**
   * @description Return icon for AIS vessel type id
   * @param id AIS shipType identifier
   * @returns fb-icon svgName value
   */
  protected getShipIcon(id: number): string {
    return getAisIcon(id).svgIcon ?? '';
  }

  protected app = inject(AppFacade);

  constructor(protected override skres: SKResourceService) {
    super('aisTargets', skres);
  }

  ngOnInit() {
    this.initItems();
  }

  close() {
    this.closed.emit();
  }

  /**
   * @description Initialise the vessel list.
   * @param silent Do not show progress bar when true.
   */
  async initItems(silent?: boolean) {
    if (this.app.sIsFetching()) {
      this.app.debug('** isFetching() ... exit.');
      return;
    }
    this.app.sIsFetching.set(!(silent ?? false));
    try {
      const list = await this.skres.listVessels();
      // add vessels context to id
      list.forEach((v: FBVessel) => (v[0] = `vessels.${v[0]}`));
      // filter out 'self'
      this.fullList = list.filter(
        (v) => v[0] !== this.app.data.vessels.self.id
      );
      this.app.sIsFetching.set(false);
      this.doFilter();
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.app.parseHttpErrorResponse(err);
      this.fullList = [];
    }
  }

  /**
   * @description Overrides base-class method to include shipType filters
   */
  protected override alignSelections() {
    super.alignSelections();
    this.shipTypes.forEach((i) => {
      i.selected = this.app.config.selections.aisTargetTypes.includes(i.id);
    });
    this.onlyIMO = this.app.config.selections.aisTargetTypes.includes(-999);
  }

  /**
   * @description Toggle filter by shipType on / off
   */
  protected toggleFilterType(enabled: boolean) {
    this.app.config.selections.aisFilterByShipType = enabled;
    this.app.saveConfig();
  }

  /**
   * @description Handle shiptype filter selection
   * @param checked Determines whether shipTypes of the supplied identifier are included or excluded.
   * @param id shipType identifier
   */
  protected shipTypeSelect(checked: boolean, id: number) {
    if (!Array.isArray(this.app.config.selections.aisTargetTypes)) {
      this.app.config.selections.aisTargetTypes = [];
    }
    const t = this.app.config.selections.aisTargetTypes.splice(0);
    if (checked) {
      if (!t.includes(id)) {
        t.push(id);
      }
    } else {
      if (t.includes(id)) {
        t.splice(t.indexOf(id), 1);
      }
    }
    this.onlyIMO = t.includes(-999);
    this.app.config.selections.aisTargetTypes = t.splice(0);
    this.app.saveConfig();
  }

  /**
   * @description Toggle selections on / off
   * @param checked Determines if all checkboxes are checked or unchecked
   */
  protected override toggleAll(checked: boolean) {
    super.toggleAll(checked);
  }

  /**
   * @description Handle vessel entry check / uncheck
   * @param checked Value indicating entry is checked / unchecked
   * @param id Vessel identifier
   */
  protected itemSelect(checked: boolean, id: string) {
    const idx = this.toggleItem(checked, id);
    // update selections
    if (checked) {
      this.skres.selectionAdd(this.collection, id);
    } else {
      this.skres.selectionRemove(this.collection, id);
    }
  }

  /**
   * @description Show vessel properties
   * @param id vessel identifier
   */
  protected itemProperties(id: string) {
    this.properties.emit(id);
  }

  /**
   * @description Focus selected vessel
   * @param id vessel identifier
   */
  protected focus(id?: string) {
    this.focusVessel.emit(id);
  }

  /**
   * @description Center map at the supplied position
   * @param position vessel position
   */
  protected emitCenter(position: Position) {
    this.pan.emit({
      center: position,
      zoomLevel: this.app.config.map.zoomLevel
    });
  }
}
