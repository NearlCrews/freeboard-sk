import { signal } from '@angular/core';
import { SKResourceService, SKSelection } from '../resources.service';

type ResourceTupleLike = [string, { name?: string }, boolean?];

export class ResourceListBase {
  protected collection!: SKSelection;
  protected filterText = '';
  protected someSel = false;
  protected allSel = false;
  protected fullList: ResourceTupleLike[] = [];
  protected filteredList = signal<ResourceTupleLike[]>([]);

  constructor(
    collection: SKSelection,
    protected skres: SKResourceService
  ) {
    this.collection = collection;
  }

  /**
   * Handle filter key event
   * @param value Text used to filter the fullList
   */
  protected filterKeyUp(value: string) {
    this.filterText = value ?? '';
    this.doFilter();
  }

  /**
   * filter & sort resource entries
   */
  protected doFilter() {
    let fl: ResourceTupleLike[];
    if (this.filterText.length === 0) {
      fl = this.fullList.slice(0);
    } else {
      const filterLower = this.filterText.toLowerCase();
      fl = this.fullList.filter((item) =>
        item[1].name?.toLowerCase().includes(filterLower)
      );
    }
    fl.sort((a, b) => (a[1].name ?? '').localeCompare(b[1].name ?? ''));
    this.filteredList.set(fl);
    this.alignSelections();
  }

  /**
   * Align select all / some / none checkbox with entry selections
   */
  protected alignSelections() {
    let anySelected = false;
    let anyUnselected = false;
    this.filteredList().forEach((i) => {
      if (i[2]) anySelected = true;
      else anyUnselected = true;
    });
    this.allSel = anySelected && !anyUnselected;
    this.someSel = anySelected && anyUnselected;
  }

  /**
   * @description Toggle selections on / off
   * @param checked Determines if all checkboxes are checked or unchecked
   */
  protected toggleAll(checked: boolean) {
    // fullList update
    this.fullList.forEach((item) => (item[2] = checked));
    // filteredList update
    this.filteredList.update((fl) => {
      fl.forEach((item) => (item[2] = checked));
      return fl;
    });
    if (checked) {
      this.skres.selectionUnfilter(this.collection);
    } else {
      this.skres.selectionClear(this.collection);
    }
    this.someSel = false;
    this.allSel = checked;
  }

  /**
   * @description Toggle item selection
   * @param checked Item is checked
   */
  protected toggleItem(checked: boolean, id: string): number {
    // fullList update
    let idx = this.fullList.findIndex((item) => item[0] === id);
    if (idx !== -1) {
      const entry = this.fullList[idx];
      if (entry) {
        entry[2] = checked;
      }
    }
    // filteredList update
    this.filteredList.update((fl) => {
      idx = fl.findIndex((item) => item[0] === id);
      if (idx !== -1) {
        const entry = fl[idx];
        if (entry) {
          entry[2] = checked;
        }
      }
      return fl;
    });

    this.alignSelections();
    const countFullList = this.fullList.length;
    const countSelected = this.fullList.filter((i) => i[2]).length;
    const fullSel = countFullList === countSelected;
    if (!this.skres.selectionIsFiltered(this.collection) && !fullSel) {
      // update selections array to contain selected items
      const sel = this.fullList
        .filter((item) => item[2])
        .map((item) => item[0]);
      this.skres.selectionClear(this.collection);
      this.skres.selectionAdd(this.collection, sel);
    } else if (this.skres.selectionIsFiltered(this.collection) && fullSel) {
      this.skres.selectionUnfilter(this.collection);
    }
    return idx;
  }
}
