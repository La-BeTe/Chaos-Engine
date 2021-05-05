import Engine from "./classes/Engine";
import { Destructives } from "./helpers/utilities";

interface Options {
    fn: Function;
    errorLevel?: 0 | 1;
    userDestructives: Partial<Destructives>;
}

export function chaosify(
    optionsOrFn?: Options | Options["fn"],
    errorLevelArg?: Options["errorLevel"],
    userDestructivesArg?: Partial<Destructives>
) {
    let fn, errorLevel, userDestructives;
    if (
        typeof optionsOrFn === "object" &&
        optionsOrFn.constructor.name === "Object"
    ) {
        fn = optionsOrFn.fn;
        errorLevel = optionsOrFn.errorLevel;
        userDestructives = optionsOrFn.userDestructives;
    } else {
        fn = optionsOrFn;
        errorLevel = errorLevelArg;
        userDestructives = userDestructivesArg;
    }
    return new Engine(fn, errorLevel, userDestructives);
}
