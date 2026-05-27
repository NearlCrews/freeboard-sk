import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { OverlayModule } from '@angular/cdk/overlay';
import {
  FbSelectComponent,
  FbSelectTriggerDirective,
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
