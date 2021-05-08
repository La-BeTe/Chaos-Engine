import Engine from "./classes/Engine";
import { Destructives, isValidObject } from "./helpers/utilities";

interface Options {
    fn: Function;
    errorLevel?: 0 | 1;
    destructives: Partial<Destructives>;
}

export function chaos(
    optionsOrFn?: Options | Options["fn"],
    errorLevelArg?: Options["errorLevel"],
    userDestructivesArg?: Partial<Destructives>
) {
    let fn, errorLevel, userDestructives;
    if (isValidObject(optionsOrFn)) {
        fn = (optionsOrFn as Options).fn;
        errorLevel = (optionsOrFn as Options).errorLevel;
        userDestructives = (optionsOrFn as Options).destructives;
    } else {
        fn = optionsOrFn;
        errorLevel = errorLevelArg;
        userDestructives = userDestructivesArg;
    }
    return new Engine(fn, errorLevel, userDestructives);
}
