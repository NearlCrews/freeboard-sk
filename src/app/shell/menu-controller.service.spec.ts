import { describe, expect, it, vi } from 'vitest';
import { MenuController } from './menu-controller.service';

describe('MenuController', () => {
  it('seeds an empty menu state', () => {
    const svc = new MenuController();
    const s = svc.state();
    expect(s.leftMenuPanel).toBe(false);
    expect(s.routeList).toBe(false);
    expect(s.anchorWatch).toBe(false);
  });

  it('opens a single panel exclusively', () => {
    const svc = new MenuController();
    svc.display('routeList', true);
    const s = svc.state();
    expect(s.leftMenuPanel).toBe(true);
    expect(s.routeList).toBe(true);
    expect(s.waypointList).toBe(false);
    expect(s.chartList).toBe(false);
  });

  it('switching panels resets the previous one', () => {
    const svc = new MenuController();
    svc.display('routeList', true);
    svc.display('chartList', true);
    const s = svc.state();
    expect(s.routeList).toBe(false);
    expect(s.chartList).toBe(true);
  });

  it('unknown key collapses the menu', () => {
    const svc = new MenuController();
    svc.display('routeList', true);
    svc.display('bogus', true);
    expect(svc.state().leftMenuPanel).toBe(false);
  });

  it('fires onClose only when show is false', () => {
    const svc = new MenuController();
    const cb = vi.fn();
    svc.registerOnClose(cb);
    svc.display('routeList', true);
    expect(cb).not.toHaveBeenCalled();
    svc.display('routeList', false);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
