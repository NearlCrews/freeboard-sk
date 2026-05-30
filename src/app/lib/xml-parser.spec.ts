import { describe, expect, it } from 'vitest';
import { parseXmlString } from './xml-parser';

describe('parseXmlString (fast-xml-parser, xml2js-compat shape)', () => {
  it('wraps nested children in arrays (xml2js explicitArray)', () => {
    const xml = '<root><child>a</child><child>b</child></root>';
    const result = parseXmlString(xml) as {
      root: { child: string[] };
    };
    expect(result.root.child).toEqual(['a', 'b']);
  });

  it('wraps single-occurrence children in arrays', () => {
    const xml = '<root><only>x</only></root>';
    const result = parseXmlString(xml) as { root: { only: string[] } };
    expect(Array.isArray(result.root.only)).toBe(true);
    expect(result.root.only).toEqual(['x']);
  });

  it('does not wrap the root element', () => {
    const xml = '<gpx version="1.1"><wpt/></gpx>';
    const result = parseXmlString(xml) as { gpx: object };
    expect(Array.isArray(result.gpx)).toBe(false);
  });

  it('exposes attributes under the $ key', () => {
    const xml = '<root><bounds minlat="1" maxlat="2"/></root>';
    const result = parseXmlString(xml) as {
      root: { bounds: { $: { minlat: string; maxlat: string } }[] };
    };
    expect(result.root.bounds[0]?.$).toEqual({ minlat: '1', maxlat: '2' });
  });

  it('exposes mixed text + attributes via _ and $', () => {
    const xml = '<root><name lang="en">Lighthouse</name></root>';
    const result = parseXmlString(xml) as {
      root: { name: { _: string; $: { lang: string } }[] };
    };
    expect(result.root.name[0]?._).toBe('Lighthouse');
    expect(result.root.name[0]?.$).toEqual({ lang: 'en' });
  });

  it('preserves attribute values as strings (no auto-number)', () => {
    const xml = '<root><x v="42"/></root>';
    const result = parseXmlString(xml) as {
      root: { x: { $: { v: string } }[] };
    };
    expect(result.root.x[0]?.$.v).toBe('42');
  });
});
