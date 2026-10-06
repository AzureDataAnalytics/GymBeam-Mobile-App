import { BleTextDecoder, encodeBleChunks } from '@/services/device-transport/bleProtocol';
import { JsonStreamFramer } from '@/services/device-transport/jsonFraming';

function decodeAll(chunks: string[]): string {
  const decoder = new BleTextDecoder();
  return chunks.map((chunk) => decoder.push(chunk)).join('');
}

describe('encodeBleChunks', () => {
  it('keeps a short message in one packet', () => {
    const chunks = encodeBleChunks('{"command":"Drill_Stop"}', 182);
    expect(chunks).toHaveLength(1);
    expect(atob(chunks[0]!)).toBe('{"command":"Drill_Stop"}');
  });

  it('splits a long message into packets no larger than the limit', () => {
    const message = JSON.stringify({ command: 'Drill', cordinates: Array(60).fill([1.25, -3.5]) });
    const chunks = encodeBleChunks(message, 20);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => expect(atob(chunk).length).toBeLessThanOrEqual(20));
    expect(decodeAll(chunks)).toBe(message);
  });

  it('returns no packets for an empty message', () => {
    expect(encodeBleChunks('', 20)).toEqual([]);
  });
});

describe('BleTextDecoder', () => {
  it('reassembles characters split across packets', () => {
    const message = '{"name":"Zoë’s drill 🏋️"}';
    // 1-byte packets split every multi-byte character.
    expect(decodeAll(encodeBleChunks(message, 1))).toBe(message);
    expect(decodeAll(encodeBleChunks(message, 3))).toBe(message);
  });

  it('holds an incomplete character until the rest arrives', () => {
    const decoder = new BleTextDecoder();
    const [first, second] = encodeBleChunks('é', 1);
    expect(decoder.push(first!)).toBe('');
    expect(decoder.push(second!)).toBe('é');
  });

  it('drops pending bytes on reset', () => {
    const decoder = new BleTextDecoder();
    decoder.push(encodeBleChunks('é', 1)[0]!);
    decoder.reset();
    expect(decoder.push(btoa('a'))).toBe('a');
  });

  it('ignores a packet that is not valid base64', () => {
    expect(new BleTextDecoder().push('***')).toBe('');
  });

  it('feeds the JSON framer across packet boundaries', () => {
    const decoder = new BleTextDecoder();
    const framer = new JsonStreamFramer();
    const stream = '{"type":"system_info","cpuUsage":12}{"type":"Drill_result","point0":1.5}';
    const messages = encodeBleChunks(stream, 20).flatMap((chunk) =>
      framer.push(decoder.push(chunk)),
    );
    expect(messages).toEqual([
      { type: 'system_info', cpuUsage: 12 },
      { type: 'Drill_result', point0: 1.5 },
    ]);
  });
});
