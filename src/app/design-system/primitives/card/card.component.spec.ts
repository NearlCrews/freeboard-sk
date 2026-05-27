import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FbCardActionsComponent,
  FbCardContentComponent,
  FbCardHeaderComponent,
  FbCardComponent,
  type FbCardActionsAlign,
  type FbCardVariant
} from './card.component';

@Component({
  standalone: true,
  imports: [
    FbCardComponent,
    FbCardHeaderComponent,
    FbCardContentComponent,
    FbCardActionsComponent
  ],
  template: `
    <fb-card [variant]="variant()">
      <fb-card-header>
        <span fbCardTitle>Title text</span>
        <span fbCardSubtitle>Subtitle text</span>
        <button fbCardHeaderActions type="button">More</button>
      </fb-card-header>
      <fb-card-content>Body content</fb-card-content>
      <fb-card-actions [align]="align()">
        <button type="button">OK</button>
      </fb-card-actions>
    </fb-card>
  `
})
class HostComponent {
  variant = signal<FbCardVariant>('filled');
  align = signal<FbCardActionsAlign>('end');
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  card: () => HTMLElement;
  header: () => HTMLElement;
  content: () => HTMLElement;
  actions: () => HTMLElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    card: () => fixture.nativeElement.querySelector('fb-card') as HTMLElement,
    header: () =>
      fixture.nativeElement.querySelector('fb-card-header') as HTMLElement,
    content: () =>
      fixture.nativeElement.querySelector('fb-card-content') as HTMLElement,
    actions: () =>
      fixture.nativeElement.querySelector('fb-card-actions') as HTMLElement
  };
}

describe('FbCardComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let card: () => HTMLElement;
  let header: () => HTMLElement;
  let content: () => HTMLElement;
  let actions: () => HTMLElement;

  beforeEach(() => {
    ({ host, fixture, card, header, content, actions } = setup());
  });

  it('renders projected header, content, and actions', () => {
    expect(header().textContent).toContain('Title text');
    expect(header().textContent).toContain('Subtitle text');
    expect(content().textContent).toContain('Body content');
    expect(actions().textContent).toContain('OK');
  });

  it('defaults variant to filled and reflects it on the data attribute', () => {
    expect(card().getAttribute('data-variant')).toBe('filled');
    expect(card().className).toContain('fb-card--filled');
  });

  it('reflects outlined variant', () => {
    host.variant.set('outlined');
    fixture.detectChanges();
    expect(card().getAttribute('data-variant')).toBe('outlined');
    expect(card().className).toContain('fb-card--outlined');
  });

  it('projects header actions into the actions slot', () => {
    const actionsSlot = header().querySelector('.fb-card-header__actions');
    expect(actionsSlot?.textContent).toContain('More');
  });

  it('reflects actions alignment on the host data attribute', () => {
    expect(actions().getAttribute('data-align')).toBe('end');
    host.align.set('space-between');
    fixture.detectChanges();
    expect(actions().getAttribute('data-align')).toBe('space-between');
    host.align.set('start');
    fixture.detectChanges();
    expect(actions().getAttribute('data-align')).toBe('start');
  });
});
