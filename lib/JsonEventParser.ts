// Named constants with unique integer values
import { Buffer } from 'buffer';

const Constants: any = {};
// Tokens
const LEFT_BRACE = Constants.LEFT_BRACE = 0x1;
const RIGHT_BRACE = Constants.RIGHT_BRACE = 0x2;
const LEFT_BRACKET = Constants.LEFT_BRACKET = 0x3;
const RIGHT_BRACKET = Constants.RIGHT_BRACKET = 0x4;
const COLON = Constants.COLON = 0x5;
const COMMA = Constants.COMMA = 0x6;
const TRUE = Constants.TRUE = 0x7;
const FALSE = Constants.FALSE = 0x8;
const NULL = Constants.NULL = 0x9;
const STRING = Constants.STRING = 0xA;
const NUMBER = Constants.NUMBER = 0xB;
// Tokenizer States
const START = Constants.START = 0x11;
const STOP = Constants.STOP = 0x12;
const TRUE1 = Constants.TRUE1 = 0x21;
const TRUE2 = Constants.TRUE2 = 0x22;
const TRUE3 = Constants.TRUE3 = 0x23;
const FALSE1 = Constants.FALSE1 = 0x31;
const FALSE2 = Constants.FALSE2 = 0x32;
const FALSE3 = Constants.FALSE3 = 0x33;
const FALSE4 = Constants.FALSE4 = 0x34;
const NULL1 = Constants.NULL1 = 0x41;
const NULL2 = Constants.NULL2 = 0x42;
const NULL3 = Constants.NULL3 = 0x43;
const NUMBER1 = Constants.NUMBER1 = 0x51;
const NUMBER3 = Constants.NUMBER3 = 0x53;
const STRING1 = Constants.STRING1 = 0x61;
const STRING2 = Constants.STRING2 = 0x62;
const STRING3 = Constants.STRING3 = 0x63;
const STRING4 = Constants.STRING4 = 0x64;
const STRING5 = Constants.STRING5 = 0x65;
const STRING6 = Constants.STRING6 = 0x66;
// Parser States
const VALUE = Constants.VALUE = 0x71;
const KEY = Constants.KEY = 0x72;
// Parser Modes
const OBJECT = Constants.OBJECT = 0x81;
const ARRAY = Constants.ARRAY = 0x82;
// Character constants
const BACK_SLASH = '\\'.charCodeAt(0);
const FORWARD_SLASH = '/'.charCodeAt(0);
const BACKSPACE = '\b'.charCodeAt(0);
const FORM_FEED = '\f'.charCodeAt(0);
const NEWLINE = '\n'.charCodeAt(0);
const CARRIAGE_RETURN = '\r'.charCodeAt(0);
const TAB = '\t'.charCodeAt(0);

const STRING_BUFFER_SIZE = 64 * 1_024;

export type JsonEvent = { type: 'value'; value: string | number | boolean | null; key: string | number | undefined } |
{ type: 'open-object'; key?: string } |
{ type: 'open-array'; key?: string } |
{ type: 'close-object' } |
{ type: 'close-array' };

export interface ICallbacks {
  onError?: (e: Error) => void;
  onEvent?: (event: JsonEvent) => void;
  onEnd?: () => void;
}

export class JsonEventParser {
  private readonly callbacks: ICallbacks;
  private tState: number = START;

  // String data
  private string = '';
  private readonly stringBuffer: Buffer = Buffer.alloc(STRING_BUFFER_SIZE);
  private stringBufferOffset = 0;
  // Unicode escapes
  private unicode = '';
  private highSurrogate: number | undefined = undefined;

  private key: any = undefined;
  private mode = 0;
  private readonly stack: any[] = [];
  private state: number = VALUE;
  // Number of bytes remaining in multi byte utf8 char to read after split boundary
  private bytes_remaining = 0;
  // Bytes in multi byte utf8 char to read
  private bytes_in_sequence: 0 | 1 | 2 | 3 | 4 = 0;
  private readonly temp_buffs: any = {
    2: Buffer.alloc(2), 3: Buffer.alloc(3), 4: Buffer.alloc(4),
  };

  // Stream offset
  private offset = -1;

  public constructor(callbacks: ICallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Alternative to {JSON.parse} written using {JsonEventParser}.
   */
  public static parse(data: Buffer): any {
    const stack: any[] = [];
    const parser = new JsonEventParser({
      onEvent(event) {
        switch (event.type) {
          case 'value':
            JsonEventParser.insertInStack(stack, event.key, event.value, false);
            break;
          case 'open-object':
            JsonEventParser.insertInStack(stack, event.key, {}, true);
            break;
          case 'open-array':
            JsonEventParser.insertInStack(stack, event.key, [], true);
            break;
          case 'close-object':
          case 'close-array':
            stack.pop();
        }
      },
    });
    parser.write(data);
    parser.end();
    return stack[0];
  }

  private static insertInStack(stack: any[], key: string | number | undefined, value: any, push: boolean): void {
    if (typeof key === 'string') {
      stack.at(-1)[key] = value;
    } else if (typeof key === 'number') {
      stack.at(-1).push(value);
    }
    if (push || stack.length === 0) {
      stack.push(value);
    }
  }

  private static toknam(code: number): string {
    for (const [ key, value ] of Object.entries(Constants)) {
      if (value === code) {
        return key;
      }
    }
    return `0x${code.toString(16)}`;
  }

  private onError(error: Error): void {
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    } else {
      throw error;
    }
  }

  private charError(buffer: Buffer, i: number): void {
    this.tState = STOP;
    this.onError(new Error(`Unexpected ${JSON.stringify(String.fromCharCode(buffer[i]))} at position ${i} in state ${JsonEventParser.toknam(this.tState)}`));
  }

  private appendStringChar(char: number): void {
    if (this.stringBufferOffset >= STRING_BUFFER_SIZE) {
      this.string += this.stringBuffer.toString('utf8');
      this.stringBufferOffset = 0;
    }

    this.stringBuffer[this.stringBufferOffset++] = char;
  }

  private appendStringBuf(buf: Buffer, start?: number, end?: number): void {
    let size = buf.length;
    if (typeof start === 'number') {
      if (typeof end === 'number') {
        if (end < 0) {
          // Adding a negative end decreeses the size
          size = buf.length - start + end;
        } else {
          size = end - start;
        }
      } else {
        size = buf.length - start;
      }
    }

    if (size < 0) {
      size = 0;
    }

    if (this.stringBufferOffset + size > STRING_BUFFER_SIZE) {
      this.string += this.stringBuffer.toString('utf8', 0, this.stringBufferOffset);
      this.stringBufferOffset = 0;
    }

    buf.copy(this.stringBuffer, this.stringBufferOffset, start, end);
    this.stringBufferOffset += size;
  }

  public write(buffer: Buffer | string): void {
    const buf = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
    let char;
    const len = buf.length;
    for (let i = 0; i < len; i++) {
      if (this.tState === START) {
        char = buf[i];
        this.offset++;
        if (char === 0x7B) {
          // {
          this.onToken(LEFT_BRACE, '{');
        } else if (char === 0x7D) {
          // }
          this.onToken(RIGHT_BRACE, '}');
        } else if (char === 0x5B) {
          // [
          this.onToken(LEFT_BRACKET, '[');
        } else if (char === 0x5D) {
          // ]
          this.onToken(RIGHT_BRACKET, ']');
        } else if (char === 0x3A) {
          // :
          this.onToken(COLON, ':');
        } else if (char === 0x2C) {
          // ,
          this.onToken(COMMA, ',');
        } else if (char === 0x74) {
          // T
          this.tState = TRUE1;
        } else if (char === 0x66) {
          // F
          this.tState = FALSE1;
        } else if (char === 0x6E) {
          // N
          this.tState = NULL1;
        } else if (char === 0x22) {
          // "
          this.string = '';
          this.stringBufferOffset = 0;
          this.tState = STRING1;
        } else if (char === 0x2D) {
          // -
          this.string = '-';
          this.tState = NUMBER1;
        } else if (char >= 0x30 && char < 0x40) {
          // 1-9
          this.string = String.fromCharCode(char);
          this.tState = NUMBER3;
        } else if (char === 0x20 || char === 0x09 || char === 0x0A || char === 0x0D) {
          // Whitespace
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === STRING1) {
        // After open quote
        // Get current byte from buffer
        char = buf[i];
        // Check for carry over of a multi byte char split between data chunks
        // & fill temp buffer it with start of this data chunk up to the boundary limit set in the last iteration
        if (this.bytes_remaining > 0) {
          let j;
          for (j = 0; j < this.bytes_remaining; j++) {
            this.temp_buffs[this.bytes_in_sequence][this.bytes_in_sequence - this.bytes_remaining + j] = buf[j];
          }

          this.appendStringBuf(this.temp_buffs[this.bytes_in_sequence]);
          this.bytes_in_sequence = this.bytes_remaining = 0;
          i = i + j - 1;
        } else if (this.bytes_remaining === 0 && char >= 128) {
          // Else if no remainder bytes carried over, parse multi byte (>=128) chars one at a time
          if (char <= 193 || char > 244) {
            return this.onError(new Error(`Invalid UTF-8 character at position ${i} in state ${JsonEventParser.toknam(this.tState)}`));
          }
          if ((char >= 194) && (char <= 223)) {
            this.bytes_in_sequence = 2;
          }
          if ((char >= 224) && (char <= 239)) {
            this.bytes_in_sequence = 3;
          }
          if ((char >= 240) && (char <= 244)) {
            this.bytes_in_sequence = 4;
          }
          if ((this.bytes_in_sequence + i) > buf.length) {
            // If bytes needed to complete char fall outside buffer length, we have a boundary split
            for (let iCompletion = 0; iCompletion <= (buf.length - 1 - i); iCompletion++) {
              // Fill temp buffer of correct size with bytes available in this chunk
              this.temp_buffs[this.bytes_in_sequence][iCompletion] = buf[i + iCompletion];
            }
            this.bytes_remaining = (i + this.bytes_in_sequence) - buf.length;
            i = buf.length - 1;
          } else {
            this.appendStringBuf(buf, i, i + this.bytes_in_sequence);
            i = i + this.bytes_in_sequence - 1;
          }
        } else if (char === 0x22) {
          this.tState = START;
          this.string += this.stringBuffer.toString('utf8', 0, this.stringBufferOffset);
          this.stringBufferOffset = 0;
          this.onToken(STRING, this.string);
          this.offset += Buffer.byteLength(this.string, 'utf8') + 1;
          this.string = '';
        } else if (char === 0x5C) {
          this.tState = STRING2;
        } else if (char >= 0x20) {
          this.appendStringChar(char);
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === STRING2) {
        // After backslash
        char = buf[i];
        if (char === 0x22) {
          this.appendStringChar(char);
          this.tState = STRING1;
        } else if (char === 0x5C) {
          this.appendStringChar(BACK_SLASH);
          this.tState = STRING1;
        } else if (char === 0x2F) {
          this.appendStringChar(FORWARD_SLASH);
          this.tState = STRING1;
        } else if (char === 0x62) {
          this.appendStringChar(BACKSPACE);
          this.tState = STRING1;
        } else if (char === 0x66) {
          this.appendStringChar(FORM_FEED);
          this.tState = STRING1;
        } else if (char === 0x6E) {
          this.appendStringChar(NEWLINE);
          this.tState = STRING1;
        } else if (char === 0x72) {
          this.appendStringChar(CARRIAGE_RETURN);
          this.tState = STRING1;
        } else if (char === 0x74) {
          this.appendStringChar(TAB);
          this.tState = STRING1;
        } else if (char === 0x75) {
          this.unicode = '';
          this.tState = STRING3;
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === STRING3 || this.tState === STRING4 ||
          this.tState === STRING5 || this.tState === STRING6) {
        // Unicode hex codes
        char = buf[i];
        // 0-9 A-F a-f
        if ((char >= 0x30 && char < 0x40) || (char > 0x40 && char <= 0x46) || (char > 0x60 && char <= 0x66)) {
          this.unicode += String.fromCharCode(char);
          if (this.tState++ === STRING6) {
            const intVal = Number.parseInt(this.unicode, 16);
            this.unicode = '';
            if (this.highSurrogate !== undefined && intVal >= 0xDC_00 && intVal < (0xDF_FF + 1)) {
              // <56320,57343> - lowSurrogate
              this.appendStringBuf(Buffer.from(String.fromCharCode(this.highSurrogate, intVal)));
              this.highSurrogate = undefined;
            } else if (this.highSurrogate === undefined && intVal >= 0xD8_00 && intVal < (0xDB_FF + 1)) {
              // <55296,56319> - highSurrogate
              this.highSurrogate = intVal;
            } else {
              if (this.highSurrogate !== undefined) {
                this.appendStringBuf(Buffer.from(String.fromCharCode(this.highSurrogate)));
                this.highSurrogate = undefined;
              }
              this.appendStringBuf(Buffer.from(String.fromCharCode(intVal)));
            }
            this.tState = STRING1;
          }
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === NUMBER1 || this.tState === NUMBER3) {
        char = buf[i];

        switch (char) {
          case 0x30:
          case 0x31:
          case 0x32:
          case 0x33:
          case 0x34:
          case 0x35:
          case 0x36:
          case 0x37:
          case 0x38:
          case 0x39:
          case 0x2E:
          case 0x65:
          case 0x45:
          case 0x2B:
          case 0x2D:
            this.string += String.fromCharCode(char);
            this.tState = NUMBER3;
            break;
          default:
            this.tState = START;
            this.numberReviver(this.string);
            this.offset += this.string.length - 1;
            this.string = '';
            i--;
            break;
        }
      } else if (this.tState === TRUE1) {
        // R
        if (buf[i] === 0x72) {
          this.tState = TRUE2;
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === TRUE2) {
        // U
        if (buf[i] === 0x75) {
          this.tState = TRUE3;
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === TRUE3) {
        // E
        if (buf[i] === 0x65) {
          this.tState = START;
          this.onToken(TRUE, true);
          this.offset += 3;
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === FALSE1) {
        // A
        if (buf[i] === 0x61) {
          this.tState = FALSE2;
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === FALSE2) {
        // L
        if (buf[i] === 0x6C) {
          this.tState = FALSE3;
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === FALSE3) {
        // S
        if (buf[i] === 0x73) {
          this.tState = FALSE4;
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === FALSE4) {
        // E
        if (buf[i] === 0x65) {
          this.tState = START;
          this.onToken(FALSE, false);
          this.offset += 4;
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === NULL1) {
        // U
        if (buf[i] === 0x75) {
          this.tState = NULL2;
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === NULL2) {
        // L
        if (buf[i] === 0x6C) {
          this.tState = NULL3;
        } else {
          return this.charError(buf, i);
        }
      } else if (this.tState === NULL3) {
        // L
        if (buf[i] === 0x6C) {
          this.tState = START;
          this.onToken(NULL, null);
          this.offset += 3;
        } else {
          return this.charError(buf, i);
        }
      }
    }
  }

  public end(): void {
    if (this.stack.length > 0) {
      this.onError(new Error('Unexpected end of file'));
    }
    if (this.callbacks.onEnd) {
      this.callbacks.onEnd();
    }
  }

  private parseError(token: number, value: any): void {
    this.tState = STOP;
    this.onError(new Error(`Unexpected ${JsonEventParser.toknam(token)} ${value ? `(${JSON.stringify(value)})` : ''} in state ${JsonEventParser.toknam(this.state)}`));
  }

  private push(): void {
    this.stack.push({ key: this.key, mode: this.mode });
  }

  private pop(): void {
    const parent = this.stack.pop();
    this.key = parent.key;
    this.mode = parent.mode;
    if (this.mode) {
      this.state = COMMA;
    }
    if (this.mode === OBJECT) {
      this.emitEvent({ type: 'close-object' });
    } else if (this.mode === ARRAY) {
      this.emitEvent({ type: 'close-array' });
    } else {
      this.state = VALUE;
    }
  }

  private emitEvent(event: JsonEvent): void {
    if (this.callbacks.onEvent) {
      this.callbacks.onEvent(event);
    }
  }

  private onToken(token: number, value: any): void {
    if (this.state === VALUE) {
      if (token === STRING || token === NUMBER || token === TRUE || token === FALSE || token === NULL) {
        if (this.mode) {
          this.state = COMMA;
        }
        this.emitEvent({ type: 'value', value, key: this.key });
      } else if (token === LEFT_BRACE) {
        this.push();
        this.emitEvent({ type: 'open-object', key: this.key });
        this.key = undefined;
        this.state = KEY;
        this.mode = OBJECT;
      } else if (token === LEFT_BRACKET) {
        this.push();
        this.emitEvent({ type: 'open-array', key: this.key });
        this.key = 0;
        this.mode = ARRAY;
        this.state = VALUE;
      } else if (token === RIGHT_BRACE) {
        if (this.mode === OBJECT) {
          this.pop();
        } else {
          return this.parseError(token, value);
        }
      } else if (token === RIGHT_BRACKET) {
        if (this.mode === ARRAY) {
          this.pop();
        } else {
          return this.parseError(token, value);
        }
      } else {
        return this.parseError(token, value);
      }
    } else if (this.state === KEY) {
      if (token === STRING) {
        this.key = value;
        this.state = COLON;
      } else if (token === RIGHT_BRACE) {
        this.pop();
      } else {
        return this.parseError(token, value);
      }
    } else if (this.state === COLON) {
      if (token === COLON) {
        this.state = VALUE;
      } else {
        return this.parseError(token, value);
      }
    } else if (this.state === COMMA) {
      if (token === COMMA) {
        if (this.mode === ARRAY) {
          this.key++;
          this.state = VALUE;
        } else if (this.mode === OBJECT) {
          this.state = KEY;
        }
      } else if (token === RIGHT_BRACKET && this.mode === ARRAY || token === RIGHT_BRACE && this.mode === OBJECT) {
        this.pop();
      } else {
        return this.parseError(token, value);
      }
    } else {
      return this.parseError(token, value);
    }
  }

  // Override to implement your own number reviver.
  // Any value returned is treated as error and will interrupt parsing.
  private numberReviver(text: string): void {
    this.onToken(NUMBER, Number(text));
  }
}
