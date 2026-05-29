import { inject, Injectable, signal } from '@angular/core';
import { FbDialogService } from 'src/app/design-system/primitives';
import { SignalKClient } from 'src/lib/signalk-client';
import { AppFacade } from 'src/app/app.facade';
import { ResourceStore } from 'src/app/stores';
import { SKInfoLayer, SKResourceSet } from './custom-resource-classes';
import { SKResourceService, SKSelection } from './resources.service';
import {
  FBInfoLayer,
  FBInfoLayers,
  InfoLayerResource,
  InfoLayers,
  ResourceSet,
  ResourceSets
} from 'src/app/types';
import { processUrlTokens } from 'src/app/app.config';
import { HttpErrorResponse } from '@angular/common/http';

// Each ResourceSet collection caches an array of [id, instance, selected]
// tuples (matching FBResourceSet shape elsewhere). The Map key is the
// collection name (e.g. 'fishing', 'myExtras').
type ResSetTuple = [string, SKResourceSet, boolean];
type FBResourceSetsMap = Map<string, ResSetTuple[]>;
type InfoLayerTuple = [string, SKInfoLayer, boolean];
type CustomResourceType = 'InfoLayer' | 'ResourceSet';

// ** Signal K custom / other resource(s) operations
@Injectable({ providedIn: 'root' })
export class FBCustomResourceService {
  private resSetCacheSignal = signal<FBResourceSetsMap>(new Map());
  readonly resourceSets = this.resSetCacheSignal.asReadonly();

  private infoLayerCacheSignal = signal<FBInfoLayers>([]);
  readonly infoLayers = this.infoLayerCacheSignal.asReadonly();

  public infoLayerParams = signal<
    { id: string; param: Record<string, unknown> }[]
  >([]);

  // Phase 3 Batch 3: direct store injection for the custom-resources taxonomy.
  private resource = inject(ResourceStore);

  constructor(
    public dialog: FbDialogService,
    public signalk: SignalKClient,
    public app: AppFacade,
    private skres: SKResourceService
  ) {}

  /** **********************************
   * Custom Resource common methods
   *************************************/

  /**
   * @description Check status and initialise custom resource paths required for Freeboard features
   * @returns object items to be added to this.app.featureFlags
   */
  public async initCustomCollections(): Promise<Record<string, boolean>> {
    const rcs: Record<string, boolean> = {};
    await Promise.all(
      this.resource.CUSTOM_RESOURCES.map(async (cr) => {
        rcs[cr.featureKey] = await this.checkCustomCollection(
          cr.name,
          cr.description
        );
      })
    );
    return rcs;
  }

  /**
   * @description Check for supplied custom resource collection
   * @param name Name of resource collection to check
   * @param description Collection description.
   * @returns true if collection is available on the Signal K server
   */
  private checkCustomCollection(
    name: string,
    description: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.signalk.api
        .get(this.app.skApiVersion, `resources/${name}`)
        .subscribe(
          () => resolve(true),
          () => {
            this.signalk
              .post(`/plugins/resources-provider/_config/${name}`, {
                description: description
              })
              .subscribe({
                next: () => resolve(true),
                error: () => resolve(false)
              });
          }
        );
    });
  }

  /**
   * @description Fetch custom resources of supplied type from Signal K server.
   * @param collection The custom resource collection endpoint to query e.g. infolayers, fishing
   * @param type Custom resource type
   * @param query  Filter criteria for resources to return
   * @returns Promise<T[]> (rejects with HTTPErrorResponse)
   */
  public customListFromServer<T>(
    collection: string,
    type: CustomResourceType,
    query?: string,
    onlySelected?: boolean
  ): Promise<T[]> {
    if (query) {
      query = query.startsWith('?') ? query : `?${query}`;
    } else {
      query = '';
    }
    return new Promise((resolve, reject) => {
      const skf = this.signalk.api.get(
        this.app.skApiVersion,
        `/resources/${collection}${query}`
      );
      skf?.subscribe(
        (res: ResourceSets | InfoLayers) => {
          const list = Object.entries(res);
          if (list.length === 0) {
            resolve([]);
            return;
          }
          list.forEach(([id, entry]) => {
            entry.id = id;
          });
          let flist: (InfoLayerTuple | ResSetTuple)[] = [];
          if (type === 'InfoLayer') {
            flist = (list as [string, InfoLayerResource][])
              .filter(([, item]) => this.isInfoLayer(item))
              .map(
                ([id, item]): InfoLayerTuple => [
                  id,
                  new SKInfoLayer(item),
                  this.isSelected(collection as SKSelection, item.type, id)
                ]
              );
          } else if (type === 'ResourceSet') {
            flist = (list as [string, ResourceSet][])
              .filter(([, item]) => this.isResourceSet(item))
              .map(
                ([id, item]): ResSetTuple => [
                  id,
                  new SKResourceSet(item),
                  this.isSelected(collection as SKSelection, item.type, id)
                ]
              );
          }
          const filtered = onlySelected ? flist.filter((i) => i[2]) : flist;
          resolve(filtered as unknown as T[]);
        },
        (err: HttpErrorResponse) => reject(err)
      );
    });
  }

  /**
   * @description Determines if a resource item is selected for display.
   * @param collection The custom resource collection endpoint to query e.g. infolayers, fishing
   * @param type Custom resource type
   * @param id  Resource identifier
   */
  private isSelected(
    collection: SKSelection,
    type: CustomResourceType,
    id: string
  ): boolean {
    if (type === 'InfoLayer') {
      return !this.skres.selectionIsFiltered(collection)
        ? true
        : this.skres.selectionHas(collection, id);
    }
    if (type === 'ResourceSet') {
      const list = this.app.config.selections.resourceSets[collection];
      return Array.isArray(list) ? list.includes(id) : false;
    }
    return false;
  }

  /** **********************************
   * ResourceSet methods
   *************************************/

  /**
   * Test if supplied item is a ResourceSet
   * @param item Item to test
   * @returns true on success
   */
  private isResourceSet(item: ResourceSet): boolean {
    if (typeof item.type === 'undefined') return false;
    if (item.type !== 'ResourceSet') return false;
    if (typeof item.values === 'undefined') return false;
    return true;
  }

  /**
   * @description Retrieve cached Resource Set | feature at index (app.data)
   * @params id Map feature id.
   * @params getFeature  true = return Feature entry, false = return whole RecordSet
   * @returns Feature OR Resource Set.
   */
  public fromResourceSetCache(
    mapFeatureId: string,
    getFeature?: boolean
  ): ResourceSet['values']['features'][number] | SKResourceSet | undefined {
    const t = mapFeatureId.split('.');
    if (t[0] !== 'rset') {
      return undefined;
    }
    const collection = t[1];
    const rSetId = t[2];
    if (!collection || !rSetId) {
      return undefined;
    }
    const lastSegment = t[t.length - 1] ?? '';
    const index = Number(lastSegment);
    const bucket = this.resSetCacheSignal().get(collection);
    if (!Array.isArray(bucket)) {
      return undefined;
    }
    const match = bucket.find((i: ResSetTuple) => i[0] === rSetId);
    if (!match) {
      return undefined;
    }
    if (!getFeature) {
      return match[1];
    }
    if (!Number.isFinite(index)) {
      return undefined;
    }
    return match[1].values.features[index];
  }

  /**
   * @description Refresh ResourceSet cache with "in bounds" items fetched from sk server
   * @param collection ResourceSet collection name
   * @param query Filter criteria for ResourceSets in placed in the cache
   */
  private async refreshResourceSets(
    collection: string,
    query?: string
  ): Promise<void> {
    if (this.resource.IGNORE_RESOURCES.includes(collection)) {
      return;
    }
    this.app.debug(`** refreshResourceSets() query: ${query}`);
    try {
      const items = await this.customListFromServer<ResSetTuple>(
        collection,
        'ResourceSet',
        query,
        true
      );
      this.resSetCacheSignal.update((current: FBResourceSetsMap) => {
        current.set(collection, items);
        return current;
      });
    } catch (err) {
      this.app.debug('** refreshResourceSets()', err);
      this.resSetCacheSignal.update((current: FBResourceSetsMap) => {
        current.set(collection, []);
        return current;
      });
    }
  }

  /**
   * Refresh ResourceSet cache with "in bounds" items for all active ResourceSet collections
   */
  public refreshResourceSetsInBounds(collection?: string): void {
    const doRefresh = async (c: string): Promise<void> => {
      if (!Array.isArray(this.app.config.selections.resourceSets[c])) {
        return;
      }
      this.app.debug(`refreshResourceSetsInBounds(${c})`);
      await this.refreshResourceSets(c, this.buildResourceSetFilterQuery());
    };

    if (collection) {
      if (!this.resource.IGNORE_RESOURCES.includes(collection)) {
        doRefresh(collection);
      }
    } else {
      Object.keys(this.app.config.selections.resourceSets)
        .filter((r) => !this.resource.IGNORE_RESOURCES.includes(r))
        .forEach((c: string) => {
          doRefresh(c);
        });
    }
  }

  /**
   * Build resource filter query to return in bounds entries.
   * @returns query string
   */
  private buildResourceSetFilterQuery(): string {
    let q = '';
    if (
      this.app.config.resources.fetchRadius !== 0 &&
      this.app.config.resources.fetchFilter
    ) {
      q = processUrlTokens(
        this.app.config.resources.fetchFilter,
        this.app.config
      );
      if (!q.startsWith('?')) {
        q = '?' + q;
      }
    }
    return q;
  }

  /**
   * Returns true if there are items selected in any ResourceSet collection.
   * Used to trigger fetch of items within a map extent.
   * */
  public anyResourceSetSelection(): boolean {
    let result = false;
    Object.entries(this.app.config.selections.resourceSets)
      .filter((r) => !this.resource.IGNORE_RESOURCES.includes(r[0]))
      .forEach((r: [string, unknown]) => {
        if (Array.isArray(r[1]) && r[1].length > 0) {
          result = true;
        }
      });
    return result;
  }

  /** **********************************
   * InfoLayer methods
   *************************************/

  /**
   * Test if supplied item is a InfoLayer
   * @param item Item to test
   * @returns true on success
   */
  private isInfoLayer(item: InfoLayerResource): boolean {
    if (typeof item.type === 'undefined') return false;
    if (item.type !== 'InfoLayer') return false;
    if (typeof item.values === 'undefined') return false;
    return true;
  }

  /**
   * @description Refresh InfoLayer cache with entries fetched from sk server
   * @param query Filter criteria for items in placed in the cache
   */
  public async refreshInfoLayers(query?: string): Promise<void> {
    if (query && !query.startsWith('?')) {
      query = '?' + query;
    }
    this.app.debug(`** refreshInfoLayers(): ${query}`);
    try {
      const layers = await this.customListFromServer<FBInfoLayer>(
        'infolayers',
        'InfoLayer',
        query,
        true
      );
      const flist = layers.filter((layer: FBInfoLayer) => layer[2]);
      this.infoLayerCacheSignal.set(flist);
    } catch (err) {
      this.app.debug('** refreshInfoLayers:', err);
    }
  }
}
