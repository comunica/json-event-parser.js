import { Transform } from 'readable-stream';
import type { JsonEvent } from './JsonEventParser';

export type JsonValue = string | number | boolean | null | IJsonObject | IJsonArray;
interface IJsonObject extends Record<string, JsonValue> {}
interface IJsonArray extends Array<JsonValue> {}

export interface IQueryDefinition {
  id: string;
  query: (string | null)[];
  returnContent: boolean;
}

export interface IQueryResult {
  query: string;
  value?: JsonValue;
}

/**
 * Emits all JSON blobs matching one of the given query.
 * A query is a path composed of object keys or `null` for array keys.
 */
export class JsonStreamPathTransformer extends Transform {
  private readonly queries: IQueryDefinition[];
  private readonly keyStack: (string | number)[] = [];
  private readonly valueStack: JsonValue[] = [];
  private currentQuery?: IQueryDefinition = undefined;

  public constructor(queries: IQueryDefinition[]) {
    super({ writableObjectMode: true, readableObjectMode: true });
    this.queries = queries;
  }

  public _transform(event: JsonEvent, encoding: string, callback: (error?: (Error | null), data?: any) => void): void {
    if (this.currentQuery === undefined) {
      this.onOtherEvent(event);
    } else {
      this.onKeptEvent(event);
    }
    callback();
  }

  private onOtherEvent(event: JsonEvent): void {
    switch (event.type) {
      case 'open-object':
        if (event.key !== undefined) {
          this.keyStack.push(event.key);
        }
        this.currentQuery = this.findCurrentQuery();
        if (this.currentQuery) {
          if (this.currentQuery.returnContent) {
            this.valueStack.push({});
          } else {
            this.push({
              query: this.currentQuery.id,
            });
            this.currentQuery = undefined;
          }
        }
        return;
      case 'open-array':
        if (event.key !== undefined) {
          this.keyStack.push(event.key);
        }
        this.currentQuery = this.findCurrentQuery();
        if (this.currentQuery) {
          if (this.currentQuery.returnContent) {
            this.valueStack.push([]);
          } else {
            this.push({
              query: this.currentQuery.id,
            });
            this.currentQuery = undefined;
          }
        }
        return;
      case 'value':
        if (event.key !== undefined) {
          this.keyStack.push(event.key);
        }
        this.currentQuery = this.findCurrentQuery();
        if (this.currentQuery) {
          this.push({
            query: this.currentQuery.id,
            value: this.currentQuery.returnContent ? event.value : undefined,
          });
          this.currentQuery = undefined;
        }
        this.keyStack.pop();
        break;
      case 'close-object':
      case 'close-array':
        this.keyStack.pop();
    }
  }

  private findCurrentQuery(): IQueryDefinition | undefined {
    for (const query of this.queries) {
      if (query.query.length === this.keyStack.length && query.query.every((value, i) =>
        value === null ? typeof this.keyStack[i] === 'number' : value === this.keyStack[i])) {
        return query;
      }
    }
    return undefined;
  }

  private onKeptEvent(event: JsonEvent): void {
    let value: any;
    switch (event.type) {
      case 'open-object':
        value = {};
        this.insertInPreviousValue(event.key, value);
        this.valueStack.push(value);
        return;
      case 'open-array':
        value = [];
        this.insertInPreviousValue(event.key, value);
        this.valueStack.push(value);
        return;
      case 'value':
        this.insertInPreviousValue(event.key, event.value);
        return;
      case 'close-object':
      case 'close-array':
        value = this.valueStack.pop();
        if (this.valueStack.length === 0) {
        // End
          this.push({
            query: this.currentQuery!.id,
            value,
          });
          this.currentQuery = undefined;
          this.keyStack.pop();
        }
    }
  }

  private insertInPreviousValue(key: number | string | undefined, value: JsonValue): void {
    const previousValue = this.valueStack[this.valueStack.length - 1];
    if (typeof key === 'number') {
      (<JsonValue[]>previousValue).push(value);
    } else if (typeof key === 'string') {
      (<any>previousValue)[key] = value;
    }
  }
}
