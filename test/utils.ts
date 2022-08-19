/**
 * Alternative to {JSON.parse} written using {JsonEventParser}.
 */
import { Readable } from 'stream';
import { JsonEventParser } from '..';

export async function parseJson(data: Iterable<any>): Promise<any> {
  const stack: any[] = [];
  for await (const event of Readable.from(data).pipe(new JsonEventParser())) {
    switch (event.type) {
      case 'value':
        insertInStack(stack, event.key, event.value, false);
        break;
      case 'open-object':
        insertInStack(stack, event.key, {}, true);
        break;
      case 'open-array':
        insertInStack(stack, event.key, [], true);
        break;
      case 'close-object':
      case 'close-array':
        stack.pop();
    }
  }
  return stack[0];
}

function insertInStack(stack: any[], key: string | number | undefined, value: any, push: boolean): void {
  if (typeof key === 'string') {
    stack[stack.length - 1][key] = value;
  } else if (typeof key === 'number') {
    stack[stack.length - 1].push(value);
  }
  if (push || stack.length === 0) {
    stack.push(value);
  }
}
