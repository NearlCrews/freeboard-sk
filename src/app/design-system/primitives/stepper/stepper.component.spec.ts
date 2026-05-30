import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FbStepActionsDirective,
  FbStepComponent,
  FbStepHeaderActionsDirective,
  FbStepperComponent
} from './stepper.component';

@Component({
  standalone: true,
  imports: [FbStepperComponent, FbStepComponent],
  template: `
    <fb-stepper
      [(activeIndex)]="activeIndex"
      [linear]="linear()"
      ariaLabel="Wizard"
      (completed)="onCompleted()"
    >
      <fb-step label="One" [complete]="aComplete()" [valid]="aValid()">
        <div class="step-a">Body A</div>
      </fb-step>
      <fb-step label="Two" [complete]="bComplete()" [valid]="bValid()">
        <div class="step-b">Body B</div>
      </fb-step>
      <fb-step label="Three">
        <div class="step-c">Body C</div>
      </fb-step>
    </fb-stepper>
  `
})
class StepperHost {
  activeIndex = signal<number>(0);
  linear = signal<boolean>(true);
  aValid = signal<boolean>(true);
  aComplete = signal<boolean>(false);
  bValid = signal<boolean>(true);
  bComplete = signal<boolean>(false);
  completedCount = 0;
  onCompleted(): void {
    this.completedCount += 1;
  }
}

@Component({
  standalone: true,
  imports: [FbStepperComponent, FbStepComponent, FbStepActionsDirective],
  template: `
    <fb-stepper [(activeIndex)]="activeIndex">
      <fb-step label="Solo">
        <p>Body</p>
        <ng-template fbStepActions>
          <button type="button" class="custom-action" (click)="custom()">
            Done
          </button>
        </ng-template>
      </fb-step>
    </fb-stepper>
  `
})
class CustomActionsHost {
  activeIndex = signal<number>(0);
  customCount = 0;
  custom(): void {
    this.customCount += 1;
  }
}

@Component({
  standalone: true,
  imports: [FbStepperComponent, FbStepComponent, FbStepHeaderActionsDirective],
  template: `
    <fb-stepper
      orientation="vertical"
      [(activeIndex)]="activeIndex"
      ariaLabel="Waypoints"
    >
      <fb-step label="Alpha">
        <div class="vbody-a">Body A</div>
        <ng-template fbStepHeaderActions>
          <button type="button" class="jump-a" (click)="jump('a')">Jump</button>
        </ng-template>
      </fb-step>
      <fb-step label="Bravo">
        <div class="vbody-b">Body B</div>
      </fb-step>
      <fb-step label="Charlie">
        <div class="vbody-c">Body C</div>
      </fb-step>
    </fb-stepper>
  `
})
class VerticalStepperHost {
  activeIndex = signal<number>(0);
  jumpedTo: string[] = [];
  jump(id: string): void {
    this.jumpedTo.push(id);
  }
}

function setup<T>(comp: new () => T): {
  fixture: ComponentFixture<T>;
  host: T;
  el: HTMLElement;
  headers: () => HTMLButtonElement[];
  stepEls: () => HTMLElement[];
  actionButtons: () => HTMLButtonElement[];
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [comp] });
  const fixture = TestBed.createComponent(comp);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    headers: () =>
      Array.from(
        el.querySelectorAll('.fb-stepper__header, .fb-step__header')
      ) as HTMLButtonElement[],
    stepEls: () => Array.from(el.querySelectorAll('fb-step')) as HTMLElement[],
    actionButtons: () =>
      Array.from(
        el.querySelectorAll('.fb-stepper__actions button')
      ) as HTMLButtonElement[]
  };
}

describe('FbStepperComponent', () => {
  let fixture: ComponentFixture<StepperHost>;
  let host: StepperHost;
  let headers: () => HTMLButtonElement[];
  let stepEls: () => HTMLElement[];
  let actionButtons: () => HTMLButtonElement[];

  beforeEach(() => {
    ({ fixture, host, headers, stepEls, actionButtons } = setup(StepperHost));
  });

  it('renders one header per step with role=tab', () => {
    const list = headers();
    expect(list.length).toBe(3);
    list.forEach((h) => expect(h.getAttribute('role')).toBe('tab'));
    expect(list[0]!.textContent).toContain('One');
    expect(list[1]!.textContent).toContain('Two');
    expect(list[2]!.textContent).toContain('Three');
  });

  it('shows only the active step body, others hidden', () => {
    const els = stepEls();
    expect(els[0]!.hasAttribute('hidden')).toBe(false);
    expect(els[1]!.hasAttribute('hidden')).toBe(true);
    expect(els[2]!.hasAttribute('hidden')).toBe(true);
  });

  it('Next advances and Back retreats', () => {
    const btns = actionButtons();
    const back = btns[0]!;
    const next = btns[1]!;
    expect(back.disabled).toBe(true);
    next.click();
    fixture.detectChanges();
    expect(host.activeIndex()).toBe(1);
    const els = stepEls();
    expect(els[0]!.hasAttribute('hidden')).toBe(true);
    expect(els[1]!.hasAttribute('hidden')).toBe(false);

    actionButtons()[0]!.click();
    fixture.detectChanges();
    expect(host.activeIndex()).toBe(0);
  });

  it('linear mode blocks header click that skips a non-complete step', () => {
    headers()[2]!.click();
    fixture.detectChanges();
    expect(host.activeIndex()).toBe(0);

    host.aComplete.set(true);
    host.bComplete.set(true);
    fixture.detectChanges();
    headers()[2]!.click();
    fixture.detectChanges();
    expect(host.activeIndex()).toBe(2);
  });

  it('Next disabled when current step is not valid', () => {
    host.aValid.set(false);
    fixture.detectChanges();
    const next = actionButtons()[1]!;
    expect(next.disabled).toBe(true);
  });

  it('emits completed when Next is pressed on the last step', () => {
    host.aComplete.set(true);
    host.bComplete.set(true);
    fixture.detectChanges();
    host.activeIndex.set(2);
    fixture.detectChanges();
    const next = actionButtons()[1]!;
    expect(next.textContent?.trim()).toBe('Finish');
    next.click();
    fixture.detectChanges();
    expect(host.completedCount).toBe(1);
    expect(host.activeIndex()).toBe(2);
  });

  it('marks the completed-step circle with data-state=complete', () => {
    host.aComplete.set(true);
    fixture.detectChanges();
    const circle = headers()[0]!.querySelector('.fb-stepper__circle');
    expect(circle?.getAttribute('data-state')).toBe('complete');
  });

  it('roving tabindex tracks the active step', () => {
    const hs = headers();
    expect(hs[0]!.getAttribute('tabindex')).toBe('0');
    expect(hs[1]!.getAttribute('tabindex')).toBe('-1');
    actionButtons()[1]!.click();
    fixture.detectChanges();
    const hs2 = headers();
    expect(hs2[0]!.getAttribute('tabindex')).toBe('-1');
    expect(hs2[1]!.getAttribute('tabindex')).toBe('0');
  });

  it('ArrowRight on a header moves focus to the next header', () => {
    const hs = headers();
    hs[0]!.focus();
    const evt = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true
    });
    hs[0]!.dispatchEvent(evt);
    fixture.detectChanges();
    expect(document.activeElement).toBe(headers()[1]);
  });
});

describe('FbStepperComponent custom actions slot', () => {
  it('replaces default footer when fbStepActions is provided', () => {
    const { host, el } = setup(CustomActionsHost);
    const customBtn = el.querySelector<HTMLButtonElement>('.custom-action')!;
    expect(customBtn).toBeTruthy();
    expect(
      el.querySelector('.fb-stepper__actions:not(.fb-stepper__actions--custom)')
    ).toBeNull();
    const spy = vi.spyOn(host, 'custom');
    customBtn.click();
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe('FbStepperComponent vertical orientation', () => {
  let fixture: ComponentFixture<VerticalStepperHost>;
  let host: VerticalStepperHost;
  let el: HTMLElement;

  beforeEach(() => {
    ({ fixture, host, el } = setup(VerticalStepperHost));
  });

  it('renders every step body (no hidden attribute on any fb-step)', () => {
    const stepEls = Array.from(el.querySelectorAll('fb-step')) as HTMLElement[];
    expect(stepEls.length).toBe(3);
    stepEls.forEach((s) => expect(s.hasAttribute('hidden')).toBe(false));
    expect(el.querySelector('.vbody-a')).toBeTruthy();
    expect(el.querySelector('.vbody-b')).toBeTruthy();
    expect(el.querySelector('.vbody-c')).toBeTruthy();
  });

  it('omits the Back / Next footer in vertical mode', () => {
    expect(el.querySelector('.fb-stepper__actions')).toBeNull();
  });

  it('header click switches the active step', () => {
    const headers = Array.from(
      el.querySelectorAll('.fb-step__header')
    ) as HTMLButtonElement[];
    expect(headers.length).toBe(3);
    headers[2]!.click();
    fixture.detectChanges();
    expect(host.activeIndex()).toBe(2);
  });

  it('renders the fbStepHeaderActions slot inside the step header row', () => {
    const jumpBtn = el.querySelector<HTMLButtonElement>('.jump-a');
    expect(jumpBtn).toBeTruthy();
    // Confirm it lives in the header row, not in the body.
    expect(jumpBtn!.closest('.fb-step__header-actions')).toBeTruthy();
    expect(jumpBtn!.closest('.fb-step__body')).toBeNull();
    jumpBtn!.click();
    expect(host.jumpedTo).toEqual(['a']);
  });

  it('ArrowDown on a vertical header rolls focus to the next step header', () => {
    const headers = Array.from(
      el.querySelectorAll('.fb-step__header')
    ) as HTMLButtonElement[];
    headers[0]!.focus();
    const evt = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true
    });
    headers[0]!.dispatchEvent(evt);
    fixture.detectChanges();
    const after = Array.from(
      el.querySelectorAll('.fb-step__header')
    ) as HTMLButtonElement[];
    expect(document.activeElement).toBe(after[1]);
  });

  it('host carries data-orientation=vertical', () => {
    const root = el.querySelector('fb-stepper') as HTMLElement | null;
    expect(root?.getAttribute('data-orientation')).toBe('vertical');
  });
});
