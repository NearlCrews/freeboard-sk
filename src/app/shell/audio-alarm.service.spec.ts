import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppFacade } from 'src/app/app.facade';
import { AudioAlarmService } from './audio-alarm.service';

interface MockAudioContext {
  state: AudioContextState;
  resume: ReturnType<typeof vi.fn>;
  onstatechange: (() => void) | null;
}

function createMockContext(): MockAudioContext {
  return {
    state: 'suspended' as AudioContextState,
    resume: vi.fn().mockResolvedValue(undefined),
    onstatechange: null
  };
}

function provideFakeFacade(ctx: MockAudioContext): void {
  const fake = {
    audio: { context: ctx as unknown as AudioContext },
    debug: vi.fn()
  };
  TestBed.configureTestingModule({
    providers: [{ provide: AppFacade, useValue: fake }]
  });
}

describe('AudioAlarmService', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    TestBed.resetTestingModule();
    ctx = createMockContext();
    provideFakeFacade(ctx);
  });

  it('init seeds status from the AudioContext state', () => {
    const svc = TestBed.inject(AudioAlarmService);
    svc.init();
    expect(svc.status()).toBe('suspended');
  });

  it('init wires onstatechange to update status', () => {
    const svc = TestBed.inject(AudioAlarmService);
    svc.init();
    ctx.state = 'running';
    ctx.onstatechange?.();
    expect(svc.status()).toBe('running');
  });

  it('enable calls resume on the context', () => {
    const svc = TestBed.inject(AudioAlarmService);
    svc.enable();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });
});
