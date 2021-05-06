# Chaos-Engine

[![codecov](https://codecov.io/gh/La-BeTe/Chaos-Engine/branch/master/graph/badge.svg?token=npPIcAYD8F)](https://codecov.io/gh/La-BeTe/Chaos-Engine)
[![BuildStatus](https://travis-ci.com/La-BeTe/Chaos-Engine.svg?branch=master)](https://travis-ci.com/La-BeTe/Chaos-Engine)

Run destructive tests on functions, test their absolute limits.

## Installation

```
$ npm install @la-bete/chaos-engine
```

## Basic Usage

```javascript
import { chaos } from "@la-bete/chaos-engine";

function sum(a, b) {
    return a + b;
}

const chaosEngine = chaos(sum);
chaosEngine.toTake("number", 4).toTake("number", 4).toReturn("number", 8);
const result = chaosEngine.run();
// result will have a status property of success and a data property containing the details of each test run
```

## API

#### N.B:

-   The `testFn` below refers to the function we are trying to run destructive tests on.
-   All methods except `toReturn` and `run` return this and so, can be chained

#### setFn

The `setFn` method can be used to set the `testFn` associated with this Engine instance. It also calls the `refresh` method internally. You can also get the current `testFn` by accessing the `fn` property on the instance.

```javascript
const chaosEngine = chaos();
// chaosEngine.fn => undefined
chaosEngine.setFn(sum);
// chaosEngine.fn => sum
```

#### setErrorLevel

The `setErrorLevel` method can be used to set the `errorLevel`. This determines if encountered errors are thrown or logged. The default value is 0 and can only be set to 0 or 1. You can also get the current `errorLevel` by accessing the `errorLevel` property on the instance.

```javascript
const chaosEngine = chaos();
// chaosEngine.errorLevel => 0
chaosEngine.setErrorLevel(1);
// chaosEngine.errorLevel => 1
chaosEngine.setErrorLevel({});
// Invalid errorLevel passed in, it would use the default value instead.
// chaosEngine.errorLevel => 0
```

#### setDestructives

The `setDestructives` method allows custom destructive arguments to be passed in. The inbuilt destructives are available on the `defaultDestructives` property of the instance. Custom destructives can be accessed on the `destructives` property of the instance. Custom destructives must be an object with string keys and array values. If the object passed to setDestructives has keys that are not one of `string`, `number`, `boolean`, `object` or `generals`, custom types can be simulated.

```javascript
const chaosEngine = chaos();
// chaosEngine.destructives => {}
chaosEngine.setDestructives(1); // Throws or logs an error depending on errorLevel
chaosEngine.setDestructives({
    string: ["      ", "23"]
});
// chaosEngine.destructives => {string: ["     ", "23"]}
chaosEngine.setDestructives({
    test: ["      ", "23"] // Passing this type of key allows you pass a type of "test" to toTake method
});
// chaosEngine.destructives => {test: ["     ", "23"]}
```

#### toTake

The `toTake` method is used to pass the argument type and example to the ChaosEngine instance. It can be called with 1-2 arguments and only specifies one arg to be passed into `testFn`. You must have initialized the Engine instance with a `testFn` or called `setFn` successfully in order to call `toTake` method.

-   If `toTake` is called with one argument, the argument is assumed to be an example of arg and it's type is automatically deduced.
-   If `toTake` is called with 2 arguments, the first is the arg type and the second becomes the arg example.

```javascript
const chaosEngine = chaos(sum);
chaosEngine.toTake(4); //type of arg is deduced to be "number"
chaosEngine.toTake("string", "hello"); //arg example is type checked to see if type passed is correct
chaosEngine.toTake({
    a: 24,
    b: {
        c: {
            d: true
        }
});
/*
 * type of arg is deduced to be {
 *      a: "number",
 *      b: {
 *          c: {
 *              d: "boolean"
 *          }
 *      }
 * }
 */
```

-   The `typeDeducer` function only deduces types for "string", "number", "boolean" and "object" as shown above.
-   If a particular type is not deducable, the `typeDeducer` returns "unknown"
-   You can add custom types by ensuring the custom type string is available as a key on the `destructives` property of the instance

#### toReturn

The `toReturn` method accepts thesame arguments as `toTake` method and specifies the return type and example of the `testFn`. If this is called, it immediately starts testing because it calls the `run` method internally.
This method returns the results of the test and also, adds a property to the results, `matchedReturnType`, which specifies for each test if the returned result from `testFn` matched the type passed to or deduced by `toReturn`.

#### run

The `run` method starts the process of testing and would not work if `toTake` had not been called initially. It returns the results of the destructive tests. You can also call the `run` method after calling `toReturn` in order to re-run the tests.

#### refresh

The `refresh` method clears and resets the ChaosEngine instance. After calling this, you have to set up the instance again. It is called by `setFn` internally, so args for one `testFn` are not carried over to the new `testFn`.
