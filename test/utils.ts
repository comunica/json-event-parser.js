/**
 * Alternative to {JSON.parse} written using {JsonEventParser}.
 */
import { Readable } from 'stream';
import { JsonEventParser } from '..';

export async function parseJson(data: Iterable<any>): Promise<any> {
  const stack: any[] = [];
  let root: any;
  for await (const event of Readable.from(data).pipe(new JsonEventParser())) {
    switch (event.type) {
      case 'value':
        root = insertInStack(stack, event.key, event.value, root);
        break;
      case 'open-object':
        root = insertInStack(stack, event.key, {}, root);
        break;
      case 'open-array':
        root = insertInStack(stack, event.key, [], root);
        break;
      case 'close-object':
      case 'close-array':
        if (stack.pop() === undefined) {
          throw new Error('Unbalanced JSON');
        }
    }
  }
  if (stack.length > 0) {
    throw new Error('Unbalanced JSON');
  }
  return root;
}

function insertInStack(stack: any[], key: string | number | undefined, value: any, root: any): any {
  if (root === undefined) {
    if (key !== undefined) {
      throw new Error('Found a key even if not expected');
    }
    root = value;
  } else if (typeof key === 'string') {
    stack[stack.length - 1][key] = value;
  } else if (typeof key === 'number') {
    if (key !== stack[stack.length - 1].length) {
      throw new Error('Not expected key');
    }
    stack[stack.length - 1].push(value);
  } else {
    throw new Error('Expecting a key to push properly the value');
  }
  if (value instanceof Object) {
    stack.push(value);
  }
  return root;
}
