// **** CUSTOM RESOURCE CLASSES **********
import { ResourceSet, CustomStyles, InfoLayerResource } from 'src/app/types';

// ** Open Binnacle / SK ResourceSet
export class SKResourceSet {
  id = '';
  name = '';
  description = '';
  values: ResourceSet['values'] = {
    type: 'FeatureCollection',
    features: []
  };
  styles: CustomStyles = {};
  type = 'ResourceSet';

  constructor(resSet?: ResourceSet) {
    if (resSet) {
      this.id = resSet.id ?? '';
      this.name = resSet.name ?? '';
      this.description = resSet.description ?? '';
      this.styles = resSet.styles ?? {};
      this.values = resSet.values ?? this.values;
    }
  }
}

// ** Open Binnacle / SK Information Layer
export class SKInfoLayer {
  id = '';
  name = '';
  description = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any = {
    url: null,
    sourceType: null,
    layers: [],
    time: {
      current: null,
      min: null,
      max: null,
      values: []
    },
    opacity: 1,
    minZoom: 1,
    maxZoom: 24,
    refreshInterval: 0
  };
  type = 'InfoLayer';

  constructor(info?: InfoLayerResource) {
    if (info) {
      this.id = info.id ?? '';
      this.name = info.name ?? '';
      this.description = info.description ?? '';
      this.values = info.values ?? this.values;
    }
  }
}
