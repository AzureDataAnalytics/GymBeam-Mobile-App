import { JsonStreamFramer } from '@/services/device-transport/jsonFraming';

describe('JsonStreamFramer', () => {
  it('parses a single complete object delivered in one chunk', () => {
    const framer = new JsonStreamFramer();
    expect(framer.push('{"type":"system_info","cpuUsage":12}')).toEqual([
      { type: 'system_info', cpuUsage: 12 },
    ]);
  });

  it('parses two objects concatenated with no delimiter in one chunk', () => {
    const framer = new JsonStreamFramer();
    const results = framer.push('{"a":1}{"b":2}');
    expect(results).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('reassembles a single object split across multiple chunks', () => {
    const framer = new JsonStreamFramer();
    expect(framer.push('{"type":"Drill_result",')).toEqual([]);
    expect(framer.push('"point0":1.23,')).toEqual([]);
    expect(framer.push('"point1":2.34}')).toEqual([
      { type: 'Drill_result', point0: 1.23, point1: 2.34 },
    ]);
  });

  it('handles a chunk boundary landing inside a string value containing braces', () => {
    const framer = new JsonStreamFramer();
    // The device name itself contains `{`/`}` — must not be mistaken for JSON structure.
    expect(framer.push('{"type":"device_info","device_name":"unit {A}')).toEqual([]);
    expect(framer.push('"}')).toEqual([{ type: 'device_info', device_name: 'unit {A}' }]);
  });

  it('handles one object completing and the next starting in the same chunk boundary', () => {
    const framer = new JsonStreamFramer();
    expect(framer.push('{"a":1}{"b":')).toEqual([{ a: 1 }]);
    expect(framer.push('2}')).toEqual([{ b: 2 }]);
  });

  it('drops a malformed frame instead of throwing or corrupting later frames', () => {
    const framer = new JsonStreamFramer();
    // Braces balance (so the framer identifies a complete span) but the
    // content isn't valid JSON — it must be dropped, not thrown, and must
    // not prevent the next, valid object from being parsed.
    const results = framer.push('{not valid json}{"good":true}');
    expect(results).toEqual([{ good: true }]);
  });

  it('ignores stray closing braces with no matching opener', () => {
    const framer = new JsonStreamFramer();
    expect(framer.push('}}}{"a":1}')).toEqual([{ a: 1 }]);
  });

  it('reset() clears in-progress state', () => {
    const framer = new JsonStreamFramer();
    framer.push('{"incomplete":');
    framer.reset();
    expect(framer.push('{"a":1}')).toEqual([{ a: 1 }]);
  });
});
