/**
 * Reassembles a raw byte/text stream into complete top-level JSON objects.
 *
 * Why this exists: the Pi (GymBeamDevice/3B-WorkingCode/blu.py) writes each
 * message as `client_socket.send(json.dumps(dic).encode('utf-8'))` with NO
 * delimiter between messages. react-native-bluetooth-classic's default
 * "delimited" connection mode would buffer forever waiting for a `\n` that
 * never arrives — so this transport connects with `delimiter: ''`, which the
 * library docs describe as an explicit opt-in that "cause[s] the full
 * buffer to be sent on read()/onDataReceived" with no delimiter logic at
 * all (verified against the library's docs/src/docs/android/device-connection.mdx,
 * not assumed). That means a single native read event can contain a partial
 * JSON object, one complete object, or several concatenated objects — this
 * class handles all three without requiring any change to the Pi firmware.
 *
 * Brace-depth counting (rather than a JSON.parse-and-retry loop) is used so
 * a stray `{`/`}` inside a string value (e.g. a device name) doesn't miscount.
 *
 * Each incoming character is processed exactly once, ever — `push()` only
 * scans the newly-arrived chunk, never the buffer it already scanned on a
 * previous call, since `depth`/`inString`/`escapeNext` already carry forward
 * whatever those earlier characters left the parser state as.
 */
export class JsonStreamFramer {
  private buffer = '';
  private depth = 0;
  private objectStart = -1;
  private inString = false;
  private escapeNext = false;

  /** Feed raw incoming text; returns zero or more complete, parsed JSON objects. */
  push(chunk: string): unknown[] {
    const baseOffset = this.buffer.length;
    this.buffer += chunk;
    const results: unknown[] = [];
    let consumedUpTo = 0;

    for (let localIndex = 0; localIndex < chunk.length; localIndex++) {
      const globalIndex = baseOffset + localIndex;
      const char = chunk[localIndex];

      if (this.inString) {
        if (this.escapeNext) {
          this.escapeNext = false;
        } else if (char === '\\') {
          this.escapeNext = true;
        } else if (char === '"') {
          this.inString = false;
        }
        continue;
      }

      if (char === '"') {
        this.inString = true;
        continue;
      }

      if (char === '{') {
        if (this.depth === 0) this.objectStart = globalIndex;
        this.depth++;
        continue;
      }

      if (char === '}' && this.depth > 0) {
        this.depth--;
        if (this.depth === 0 && this.objectStart >= 0) {
          const candidate = this.buffer.slice(this.objectStart, globalIndex + 1);
          try {
            results.push(JSON.parse(candidate));
          } catch {
            // Malformed frame (e.g. torn mid-write) — drop it rather than
            // throw, so one bad frame can't take down the telemetry stream.
          }
          consumedUpTo = globalIndex + 1;
          this.objectStart = -1;
        }
      }
    }

    this.buffer = this.buffer.slice(consumedUpTo);
    if (this.objectStart >= 0) {
      // An object is still open across this push() boundary — rebase its
      // start index into the now-shorter buffer's coordinate space.
      this.objectStart -= consumedUpTo;
    }
    return results;
  }

  reset(): void {
    this.buffer = '';
    this.depth = 0;
    this.objectStart = -1;
    this.inString = false;
    this.escapeNext = false;
  }
}
