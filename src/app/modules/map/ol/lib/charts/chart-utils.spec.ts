import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import {
  assignImageBlob,
  extentFromBounds,
  resolveLayerMaxZoom
} from './chart-utils';

describe('resolveLayerMaxZoom', () => {
  it('returns chart max when over-zoom disabled', () => {
    expect(resolveLayerMaxZoom(12, 20, false)).toBe(12);
  });

  it('returns chart max when map max is not a number', () => {
    expect(resolveLayerMaxZoom(12, undefined, true)).toBe(12);
  });

  it('uses map max when chart max is undefined and over-zoom enabled', () => {
    expect(resolveLayerMaxZoom(undefined, 20, true)).toBe(20);
  });

  it('uses the larger of chart and map max when over-zoom enabled', () => {
    expect(resolveLayerMaxZoom(12, 20, true)).toBe(20);
    expect(resolveLayerMaxZoom(24, 20, true)).toBe(24);
  });
});

describe('extentFromBounds', () => {
  it('returns undefined for missing bounds', () => {
    expect(extentFromBounds()).toBe(undefined);
  });

  it('returns undefined for invalid bounds length', () => {
    expect(extentFromBounds([90, 90, 90])).toBe(undefined);
  });

  it('returns undefined for invalid bounds values', () => {
    expect(extentFromBounds([90, 90, 90, 300])).toBe(undefined);
  });
});

describe('assignImageBlob', () => {
  let createSpy: ReturnType<typeof vi.spyOn>;
  let revokeSpy: ReturnType<typeof vi.spyOn>;
  const FAKE_URL = 'blob:assignImageBlob-test';

  beforeEach(() => {
    createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(FAKE_URL);
    revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });

  it('points the image at the freshly minted object URL', () => {
    const img = new Image();
    const result = assignImageBlob(img, new Blob(['x']));
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe(FAKE_URL);
    expect(img.src).toContain(FAKE_URL);
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('revokes the object URL after the image load event', () => {
    const img = new Image();
    assignImageBlob(img, new Blob(['x']));
    img.dispatchEvent(new Event('load'));
    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith(FAKE_URL);
  });

  it('revokes the object URL after the image error event', () => {
    const img = new Image();
    assignImageBlob(img, new Blob(['x']));
    img.dispatchEvent(new Event('error'));
    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith(FAKE_URL);
  });

  it('only revokes once even if both events fire', () => {
    const img = new Image();
    assignImageBlob(img, new Blob(['x']));
    img.dispatchEvent(new Event('load'));
    img.dispatchEvent(new Event('error'));
    expect(revokeSpy).toHaveBeenCalledTimes(1);
  });
});
