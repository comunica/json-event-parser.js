# JSON Event Parser

[![Build status](https://github.com/Tpt/json-event-parser.js/workflows/CI/badge.svg)](https://github.com/Tpt/json-event-parser.js/actions?query=workflow%3ACI)
[![npm version](https://badge.fury.io/js/json-event-parser.svg)](https://www.npmjs.com/package/json-event-parser)

A streaming SAX-style JSON parser.

This is a fork of [`jsonparse`](https://github.com/creationix/jsonparse).


## Installation

```bash
$ npm install json-event-parser
```
or
```bash
$ yarn add json-event-parser
```

This package also works out-of-the-box in browsers via tools such as [webpack](https://webpack.js.org/) and [browserify](http://browserify.org/).

## Usage

Example:
```typescript
import { JsonEventParser } from 'json-event-parser';

const p = new JsonEventParser({
  onEvent(event) {
    console.log(`Event of type ${event.type}`);
  },
  onEnd() {
    console.log('Parsing done!');
  },
  onError(error) {
    console.error(error);
  },
});
p.write('{"test": "fo');
p.write('o"}');
p.end();
```

The event fields are:
* `type`: the event type. Might be `"value"` (a plain value i.e. a string, a number, a boolean or null), `"open-array"` and `"close-array"` to mark that an array is opened and close, or `"open-object"` and `"close-object"` to mark the same thing with objects.
* `value`: used on the `"value"` type to store the value itself.
* `key`: used on the `"value"`, `"open-array"` and `"open-object"` to store the key in the parent object or the position in the parent array.

## License

This code is released under the [MIT license](http://opensource.org/licenses/MIT).
