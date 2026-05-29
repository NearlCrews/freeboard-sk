import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { OverlayModule } from '@angular/cdk/overlay';
import {
  FbSelectComponent,
  FbSelectOptionTemplateDirective,
  FbSelectTriggerDirective,
  type FbSelectGroup,
  type FbSelectOption
} from './select.component';

@Component({
  standalone: true,
  imports: [FbSelectComponent],
  template: `
    <fb-select
      name="theme"
      [options]="options()"
      [(value)]="value"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [ariaLabel]="ariaLabel()"
    ></fb-select>
  `
})
class HostComponent {
  options = signal<readonly FbSelectOption[]>([
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark', disabled: true },
    { id: 'night-red', label: 'Night red' }
  ]);
  value = signal<string | null>(null);
  placeholder = signal<string>('Choose theme');
  disabled = signal<boolean>(false);
  invalid = signal<boolean>(false);
  ariaLabel = signal<string>('Theme');
}

@Component({
  standalone: true,
  imports: [FbSelectComponent],
  template: `
    <fb-select
      name="zoom"
      [options]="options()"
      [(value)]="value"
      ariaLabel="Zoom"
    ></fb-select>
  `
})
class NumericHostComponent {
  options = signal<readonly FbSelectOption<number>[]>([
    { id: 10, label: 'Ten' },
    { id: 20, label: 'Twenty' },
    { id: 30, label: 'Thirty' }
  ]);
  value = signal<number | null>(null);
}

@Component({
  standalone: true,
  imports: [FbSelectComponent],
  template: `
    <fb-select
      name="cats"
      [options]="options()"
      [(values)]="values"
      [multiple]="true"
      ariaLabel="Categories"
    ></fb-select>
  `
})
class MultiHostComponent {
  options = signal<readonly FbSelectOption[]>([
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Bravo' },
    { id: 'c', label: 'Charlie' },
    { id: 'd', label: 'Delta' }
  ]);
  values = signal<readonly string[]>([]);
}

@Component({
  standalone: true,
  imports: [FbSelectComponent, FbSelectTriggerDirective],
  template: `
    <fb-select
      name="mime"
      [options]="options()"
      [(value)]="value"
      ariaLabel="Mime"
    >
      <span fb-select-trigger data-testid="custom-trigger">
        ICON {{ value() ?? '' }}
      </span>
    </fb-select>
  `
})
class CustomTriggerHostComponent {
  options = signal<readonly FbSelectOption[]>([
    { id: 'md', label: 'Markdown' },
    { id: 'txt', label: 'Plain text' }
  ]);
  value = signal<string | null>(null);
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  trigger: () => HTMLButtonElement;
  options: () => HTMLElement[];
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [HostComponent, OverlayModule]
  });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    trigger: () =>
      fixture.nativeElement.querySelector(
        '.fb-select__trigger'
      ) as HTMLButtonElement,
    options: () =>
      Array.from(
        document.querySelectorAll('.fb-select__option')
      ) as HTMLElement[]
  };
}

describe('FbSelectComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let trigger: () => HTMLButtonElement;
  let options: () => HTMLElement[];

  beforeEach(() => {
    ({ host, fixture, trigger, options } = setup());
  });

  it('renders a combobox trigger with the placeholder when no value', () => {
    const btn = trigger();
    expect(btn.getAttribute('role')).toBe('combobox');
    expect(btn.getAttribute('aria-haspopup')).toBe('listbox');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.textContent).toContain('Choose theme');
  });

  it('opens the listbox on click and shows option rows', () => {
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    const opts = options();
    expect(opts.length).toBe(3);
    expect(opts[0]!.getAttribute('role')).toBe('option');
  });

  it('selects an option on click and closes', () => {
    trigger().click();
    fixture.detectChanges();
    options()[2]!.click();
    fixture.detectChanges();
    expect(host.value()).toBe('night-red');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('marks the selected option with aria-selected=true', () => {
    host.value.set('light');
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    const opts = options();
    expect(opts[0]!.getAttribute('aria-selected')).toBe('true');
    expect(opts[2]!.getAttribute('aria-selected')).toBe('false');
  });

  it('ignores clicks on disabled options', () => {
    trigger().click();
    fixture.detectChanges();
    options()[1]!.click();
    fixture.detectChanges();
    expect(host.value()).toBe(null);
  });

  it('reflects ariaLabel and aria-invalid', () => {
    host.invalid.set(true);
    fixture.detectChanges();
    const btn = trigger();
    expect(btn.getAttribute('aria-label')).toBe('Theme');
    expect(btn.getAttribute('aria-invalid')).toBe('true');
  });

  it('shows the selected label after picking a value', () => {
    host.value.set('night-red');
    fixture.detectChanges();
    expect(trigger().textContent).toContain('Night red');
  });

  it('does not open when disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('FbSelectComponent (numeric ids)', () => {
  let host: NumericHostComponent;
  let fixture: ComponentFixture<NumericHostComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NumericHostComponent, OverlayModule]
    });
    fixture = TestBed.createComponent(NumericHostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
  });

  it('selects a numeric-keyed option and stores the number in the model', () => {
    const trigger = fixture.nativeElement.querySelector(
      '.fb-select__trigger'
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    const opts = Array.from(
      document.querySelectorAll('.fb-select__option')
    ) as HTMLElement[];
    opts[1]!.click();
    fixture.detectChanges();
    expect(host.value()).toBe(20);
    expect(typeof host.value()).toBe('number');
  });

  it('renders the matching label when a numeric value is set', () => {
    host.value.set(30);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector(
      '.fb-select__trigger'
    ) as HTMLButtonElement;
    expect(trigger.textContent).toContain('Thirty');
  });
});

describe('FbSelectComponent (multiple mode)', () => {
  let host: MultiHostComponent;
  let fixture: ComponentFixture<MultiHostComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MultiHostComponent, OverlayModule]
    });
    fixture = TestBed.createComponent(MultiHostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
  });

  function triggerBtn(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '.fb-select__trigger'
    ) as HTMLButtonElement;
  }

  function visibleOptions(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll('.fb-select__option')
    ) as HTMLElement[];
  }

  it('marks the listbox as aria-multiselectable', () => {
    triggerBtn().click();
    fixture.detectChanges();
    const listbox = document.querySelector('.fb-select__listbox')!;
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('toggles values without closing the listbox', () => {
    triggerBtn().click();
    fixture.detectChanges();
    visibleOptions()[0]!.click();
    fixture.detectChanges();
    visibleOptions()[2]!.click();
    fixture.detectChanges();
    expect([...host.values()]).toEqual(['a', 'c']);
    expect(triggerBtn().getAttribute('aria-expanded')).toBe('true');
    // Toggling off
    visibleOptions()[0]!.click();
    fixture.detectChanges();
    expect([...host.values()]).toEqual(['c']);
  });

  it('shows a count once more than two values are selected', () => {
    host.values.set(['a', 'b', 'c']);
    fixture.detectChanges();
    expect(triggerBtn().textContent).toContain('3 selected');
  });

  it('shows comma-joined labels for two or fewer values', () => {
    host.values.set(['a', 'b']);
    fixture.detectChanges();
    expect(triggerBtn().textContent).toContain('Alpha, Bravo');
  });
});

@Component({
  standalone: true,
  imports: [FbSelectComponent],
  template: `
    <fb-select
      name="wt"
      [groups]="groups()"
      [(value)]="value"
      ariaLabel="Waypoint type"
    ></fb-select>
  `
})
class GroupedHostComponent {
  groups = signal<readonly FbSelectGroup[]>([
    {
      label: 'Points of Interest',
      options: [
        { id: 'default', label: 'Waypoint' },
        { id: 'whale', label: 'Whale Sighting' }
      ]
    },
    {
      label: 'Alarms',
      options: [{ id: 'pob', label: 'Person Overboard' }]
    },
    {
      label: 'Racing',
      options: [
        { id: 'start-boat', label: 'Start Boat' },
        { id: 'start-pin', label: 'Start Pin' }
      ]
    }
  ]);
  value = signal<string | null>(null);
}

@Component({
  standalone: true,
  imports: [FbSelectComponent, FbSelectOptionTemplateDirective],
  template: `
    <fb-select
      name="icons"
      [options]="options()"
      [(value)]="value"
      ariaLabel="Icon"
    >
      <ng-template fbSelectOption let-option>
        <span class="custom-row" [attr.data-id]="option.id">
          GLYPH:{{ option.id }}
        </span>
      </ng-template>
    </fb-select>
  `
})
class OptionTemplateHostComponent {
  options = signal<readonly FbSelectOption[]>([
    { id: 'anchor', label: 'Anchor' },
    { id: 'fuel', label: 'Fuel' }
  ]);
  value = signal<string | null>(null);
}

describe('FbSelectComponent (custom trigger slot)', () => {
  it('renders the projected trigger content in place of the default label', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CustomTriggerHostComponent, OverlayModule]
    });
    const fixture = TestBed.createComponent(CustomTriggerHostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    host.value.set('md');
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector(
      '.fb-select__trigger'
    ) as HTMLButtonElement;
    const custom = trigger.querySelector('[data-testid="custom-trigger"]');
    expect(custom).not.toBeNull();
    expect(trigger.textContent).toContain('ICON');
    expect(trigger.textContent).not.toContain('Markdown');
  });

  it('still falls back to the placeholder when nothing is selected', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CustomTriggerHostComponent, OverlayModule]
    });
    const fixture = TestBed.createComponent(CustomTriggerHostComponent);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector(
      '.fb-select__trigger'
    ) as HTMLButtonElement;
    expect(trigger.textContent).toContain('Select...');
  });
});

describe('FbSelectComponent (grouped options)', () => {
  let host: GroupedHostComponent;
  let fixture: ComponentFixture<GroupedHostComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [GroupedHostComponent, OverlayModule]
    });
    fixture = TestBed.createComponent(GroupedHostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
  });

  function triggerBtn(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '.fb-select__trigger'
    ) as HTMLButtonElement;
  }

  function visibleOptions(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll('.fb-select__option')
    ) as HTMLElement[];
  }

  function visibleGroupLabels(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll('.fb-select__group-label')
    ) as HTMLElement[];
  }

  it('renders one group label per provided group, in order', () => {
    triggerBtn().click();
    fixture.detectChanges();
    const labels = visibleGroupLabels();
    expect(labels.map((el) => el.textContent?.trim())).toEqual([
      'Points of Interest',
      'Alarms',
      'Racing'
    ]);
    expect(labels[0]!.getAttribute('aria-hidden')).toBe('true');
    expect(labels[0]!.getAttribute('role')).toBe('presentation');
  });

  it('flattens grouped options for keyboard nav across boundaries', () => {
    triggerBtn().click();
    fixture.detectChanges();
    expect(visibleOptions().length).toBe(5);
    // After open, syncActiveToValue lands on the first enabled option
    // (index 0 = "default", Points of Interest). Four ArrowDowns walk
    // across both group boundaries to the last option.
    const sequence: string[] = [];
    for (let i = 0; i < 4; i++) {
      triggerBtn().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );
      fixture.detectChanges();
      const active = document.querySelector(
        '.fb-select__option--active'
      ) as HTMLElement | null;
      if (active) sequence.push(active.id);
    }
    expect(sequence).toEqual([
      'wt-opt-whale',
      'wt-opt-pob',
      'wt-opt-start-boat',
      'wt-opt-start-pin'
    ]);
    // End key jumps to the very last enabled option regardless of group
    triggerBtn().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true })
    );
    fixture.detectChanges();
    const last = document.querySelector(
      '.fb-select__option--active'
    ) as HTMLElement | null;
    expect(last?.id).toBe('wt-opt-start-pin');
    // Home key wraps back to the first enabled option in the first group
    triggerBtn().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true })
    );
    fixture.detectChanges();
    const first = document.querySelector(
      '.fb-select__option--active'
    ) as HTMLElement | null;
    expect(first?.id).toBe('wt-opt-default');
  });

  it('selects a grouped option on click and stores its id', () => {
    triggerBtn().click();
    fixture.detectChanges();
    const opts = visibleOptions();
    // pob is the 3rd flat option (POI/POI/Alarms)
    opts[2]!.click();
    fixture.detectChanges();
    expect(host.value()).toBe('pob');
  });
});

describe('FbSelectComponent (custom option template)', () => {
  let fixture: ComponentFixture<OptionTemplateHostComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [OptionTemplateHostComponent, OverlayModule]
    });
    fixture = TestBed.createComponent(OptionTemplateHostComponent);
    fixture.detectChanges();
  });

  function triggerBtn(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '.fb-select__trigger'
    ) as HTMLButtonElement;
  }

  it('renders custom content per option from the projected template', () => {
    triggerBtn().click();
    fixture.detectChanges();
    const rows = Array.from(
      document.querySelectorAll('.custom-row')
    ) as HTMLElement[];
    expect(rows.length).toBe(2);
    expect(rows[0]!.textContent).toContain('GLYPH:anchor');
    expect(rows[1]!.textContent).toContain('GLYPH:fuel');
    // Default label text path is suppressed
    const firstOption = document.querySelector('.fb-select__option')!;
    expect(firstOption.textContent).not.toContain('Anchor');
  });

  it('still selects the option when its custom row is clicked', () => {
    triggerBtn().click();
    fixture.detectChanges();
    const rows = Array.from(
      document.querySelectorAll('.fb-select__option')
    ) as HTMLElement[];
    rows[1]!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('fuel');
  });
});

@Component({
  standalone: true,
  imports: [FbSelectComponent],
  template: `
    <fb-select
      name="port"
      [options]="options()"
      [(value)]="value"
      ariaLabel="Port"
    ></fb-select>
  `
})
class TypedNumberHostComponent {
  options = signal<readonly FbSelectOption<number>[]>([
    { id: 1, label: 'One' },
    { id: 2, label: 'Two' },
    { id: 3, label: 'Three' }
  ]);
  value = signal<number | null>(null);
}

@Component({
  standalone: true,
  imports: [FbSelectComponent],
  template: `
    <fb-select
      name="multi-tags"
      [options]="options()"
      [(values)]="values"
      [multi]="true"
      ariaLabel="Tags"
    ></fb-select>
  `
})
class TypedMultiHostComponent {
  options = signal<readonly FbSelectOption<number>[]>([
    { id: 10, label: 'Ten' },
    { id: 20, label: 'Twenty' },
    { id: 30, label: 'Thirty' }
  ]);
  values = signal<readonly number[]>([]);
}

@Component({
  standalone: true,
  imports: [FbSelectComponent],
  template: `
    <fb-select
      name="theme-default"
      [options]="options()"
      [(value)]="value"
      ariaLabel="Theme"
    ></fb-select>
  `
})
class StringDefaultHostComponent {
  options = signal<readonly FbSelectOption[]>([
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' }
  ]);
  value = signal<string | null>(null);
}

describe('FbSelectComponent (typed-number option)', () => {
  let fixture: ComponentFixture<TypedNumberHostComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TypedNumberHostComponent, OverlayModule]
    });
    fixture = TestBed.createComponent(TypedNumberHostComponent);
    fixture.detectChanges();
  });

  it('preserves the number type when selecting a typed-number option', () => {
    const trigger = fixture.nativeElement.querySelector(
      '.fb-select__trigger'
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    const opts = Array.from(
      document.querySelectorAll('.fb-select__option')
    ) as HTMLElement[];
    opts[2]!.click();
    fixture.detectChanges();
    const host = fixture.componentInstance;
    expect(host.value()).toBe(3);
    expect(typeof host.value()).toBe('number');
  });
});

describe('FbSelectComponent (typed-multi-select via `multi` input)', () => {
  let fixture: ComponentFixture<TypedMultiHostComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TypedMultiHostComponent, OverlayModule]
    });
    fixture = TestBed.createComponent(TypedMultiHostComponent);
    fixture.detectChanges();
  });

  function triggerBtn(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '.fb-select__trigger'
    ) as HTMLButtonElement;
  }

  function visibleOptions(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll('.fb-select__option')
    ) as HTMLElement[];
  }

  it('activates multi mode through the `multi` input alias', () => {
    triggerBtn().click();
    fixture.detectChanges();
    const listbox = document.querySelector('.fb-select__listbox')!;
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('accumulates typed-number ids without closing the listbox', () => {
    triggerBtn().click();
    fixture.detectChanges();
    visibleOptions()[0]!.click();
    fixture.detectChanges();
    visibleOptions()[2]!.click();
    fixture.detectChanges();
    const host = fixture.componentInstance;
    expect([...host.values()]).toEqual([10, 30]);
    expect(typeof host.values()[0]).toBe('number');
    expect(triggerBtn().getAttribute('aria-expanded')).toBe('true');
  });

  it('shows comma-joined labels for the selected typed-number values', () => {
    fixture.componentInstance.values.set([10, 20]);
    fixture.detectChanges();
    expect(triggerBtn().textContent).toContain('Ten, Twenty');
  });
});

describe('FbSelectComponent (string-typed default unchanged)', () => {
  let fixture: ComponentFixture<StringDefaultHostComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [StringDefaultHostComponent, OverlayModule]
    });
    fixture = TestBed.createComponent(StringDefaultHostComponent);
    fixture.detectChanges();
  });

  it('keeps the string-id default behavior for untyped consumers', () => {
    const trigger = fixture.nativeElement.querySelector(
      '.fb-select__trigger'
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    const opts = Array.from(
      document.querySelectorAll('.fb-select__option')
    ) as HTMLElement[];
    opts[1]!.click();
    fixture.detectChanges();
    const host = fixture.componentInstance;
    expect(host.value()).toBe('dark');
    expect(typeof host.value()).toBe('string');
  });
});
