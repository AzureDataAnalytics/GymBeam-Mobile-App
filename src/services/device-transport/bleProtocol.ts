export type BleCharacteristicInfo = {
  uuid: string;
  isWritableWithResponse: boolean;
  isWritableWithoutResponse: boolean;
  isNotifiable: boolean;
  isIndicatable: boolean;
};

export type BleServiceInfo = {
  uuid: string;
  characteristics: BleCharacteristicInfo[];
};

export type BleUartLink = {
  serviceUuid: string;
  writeUuid: string;
  writeWithResponse: boolean;
  notifyUuid: string;
};

const STANDARD_SERVICE_UUID = /^0000[0-9a-f]{4}-0000-1000-8000-00805f9b34fb$/i;

export function findBleUartLink(services: BleServiceInfo[]): BleUartLink | null {
  for (const service of services) {
    if (STANDARD_SERVICE_UUID.test(service.uuid)) continue;

    const write = service.characteristics.find(
      (item) => item.isWritableWithResponse || item.isWritableWithoutResponse,
    );
    const notify = service.characteristics.find(
      (item) => (item.isNotifiable || item.isIndicatable) && item.uuid !== write?.uuid,
    );
    if (write && notify) {
      return {
        serviceUuid: service.uuid,
        writeUuid: write.uuid,
        writeWithResponse: write.isWritableWithResponse,
        notifyUuid: notify.uuid,
      };
    }
  }
  return null;
}

export const BLE_ATT_HEADER_BYTES = 3;
export const BLE_REQUESTED_MTU = 185;
export const BLE_MIN_CHUNK_BYTES = 20;

function utf8Encode(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

function toBase64(bytes: number[]): string {
  return btoa(String.fromCharCode(...bytes));
}

export function encodeBleChunks(text: string, chunkBytes: number): string[] {
  const size = Math.max(1, Math.floor(chunkBytes));
  const bytes = utf8Encode(text);
  const chunks: string[] = [];
  for (let start = 0; start < bytes.length; start += size) {
    chunks.push(toBase64(bytes.slice(start, start + size)));
  }
  return chunks;
}

function sequenceLength(leadByte: number): number {
  if (leadByte < 0x80) return 1;
  if (leadByte >= 0xc0 && leadByte < 0xe0) return 2;
  if (leadByte >= 0xe0 && leadByte < 0xf0) return 3;
  if (leadByte >= 0xf0 && leadByte < 0xf8) return 4;
  // A stray continuation or invalid byte: consume it alone.
  return 1;
}

export class BleTextDecoder {
  private pending: number[] = [];

  push(base64: string): string {
    let binary: string;
    try {
      binary = atob(base64);
    } catch {
      return '';
    }
    for (let index = 0; index < binary.length; index++) {
      this.pending.push(binary.charCodeAt(index));
    }

    let text = '';
    let offset = 0;
    while (offset < this.pending.length) {
      const lead = this.pending[offset]!;
      const length = sequenceLength(lead);
      if (offset + length > this.pending.length) break;

      if (length === 1) {
        text += lead < 0x80 ? String.fromCharCode(lead) : '�';
      } else {
        let code = lead & (0xff >> (length + 1));
        for (let index = 1; index < length; index++) {
          code = (code << 6) | (this.pending[offset + index]! & 0x3f);
        }
        text += String.fromCodePoint(code);
      }
      offset += length;
    }

    this.pending = this.pending.slice(offset);
    return text;
  }

  reset(): void {
    this.pending = [];
  }
}
