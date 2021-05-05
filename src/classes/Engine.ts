import generateArgs from "../helpers/generateArgs";
import { throwError, returnError } from "./Error";
import { Destructives } from "../helpers/utilities";

export default class Engine {
    private fnReturnValue: unknown;
    private fnReturnType: unknown;
    private readonly fnArgs: unknown[] = [];
    private readonly destructiveArgs: Array<Array<unknown>> = [];

    constructor(
        private _fn?: any,
        private _errorLevel: any = 0,
        private _userDestructives: any = {}
    ) {
        typeof _fn !== "undefined" && this.setFn(_fn);
        this.setErrorLevel(_errorLevel);
        this.setDestructives(_userDestructives);
    }

    get destructives() {
        const result: { [x: string]: any[] } = {};
        for (const each in this._userDestructives) {
            if (Array.isArray(this._userDestructives[each]))
                result[each] = this._userDestructives[each];
        }
        return { ...result };
    }

    get fn() {
        return this._fn;
    }

    get errorLevel() {
        return this._errorLevel;
    }

    setDestructives(destructives: { [x: string]: unknown[] }) {
        const result: { [x: string]: any[] } = {};
        for (const each in destructives) {
            const arr = destructives[each];
            if (Array.isArray(arr)) result[each] = [...arr];
            else
                this.sendError(
                    "Please pass an array of values for each destructive property"
                );
        }
        this._userDestructives = { ...result };
        return this;
    }

    setFn(fn: Function) {
        if (!fn || typeof fn !== "function")
            this.sendError("Chaos Engine expects a function argument");
        else {
            this.refresh();
            this._fn = fn;
        }
        return this;
    }

    setErrorLevel(errorLevel: 0 | 1) {
        if (errorLevel !== this._errorLevel) {
            if (errorLevel === 1) this._errorLevel = 1;
            else {
                if (errorLevel !== 0)
                    returnError(
                        `Invalid error level '${errorLevel}' passed in, using default error level...`
                    );
                this._errorLevel = 0;
            }
        }
        return this;
    }

    toTake(argType: unknown, argExample?: unknown) {
        if (typeof this._fn !== "function") {
            this.sendError(
                "You have to set the function before passing its arguments."
            );
            return this;
        }
        // If only one argument is passed in, make it argExample and deduce its type
        if (typeof argExample === "undefined") {
            argExample = argType;
            argType = this.buildType(argExample);
        }
        if (this.typeCheck(argType, argExample)) {
            this.destructiveArgs.push(this.generateArgs(argType, argExample));
            this.fnArgs.push(argExample);
        } else {
            this.sendError(
                `ToTake expects the example ${JSON.stringify(
                    argExample
                )} to have type ${JSON.stringify(argType)}`
            );
        }
        return this;
    }

    toReturn(returnType: unknown, returnExample?: unknown) {
        if (typeof this._fn !== "function") {
            return this.sendError(
                "You have to set the function before passing a return value."
            );
        }
        if (typeof returnExample === "undefined") {
            returnExample = returnType;
            returnType = this.buildType(returnExample);
        }
        if (this.typeCheck(returnType, returnExample)) {
            this.fnReturnValue = returnExample;
            this.fnReturnType = returnType;
        } else {
            this.sendError(
                `ToReturn expects the example ${JSON.stringify(
                    returnExample
                )} to have type ${JSON.stringify(returnType)}`
            );
        }
        return this.run();
    }

    run() {
        if (this.fnArgs.length === 0) {
            return this.sendError(
                "You have to call ToTake method at least once before calling the Run method."
            );
        }
        // Commented out because ToTake method already handles this
        // if (typeof this._fn !== "function") {
        //     return this.sendError(
        //         "You have to set the function to run tests on first."
        //     );
        // }
        return this.startTesting();
    }

    refresh() {
        this.fnReturnValue = undefined;
        this.fnReturnType = undefined;
        this.fnArgs.length = 0;
        this.destructiveArgs.length = 0;
        this._fn = undefined;
        this._userDestructives = {};
        this._errorLevel = 0;
    }

    private generateArgs(argType: unknown, argExample?: unknown) {
        return generateArgs(argType, argExample, this._userDestructives);
    }

    private startTesting() {
        const results: {
            error: boolean;
            output: unknown;
            timeTaken: string;
            inputs: unknown[];
            matchedReturnType?: boolean;
        }[] = [];
        for (let i = 0; i < this.destructiveArgs.length; i++) {
            const destructiveArgs = [...this.destructiveArgs[i]];
            for (let j = 0; j < destructiveArgs.length; j++) {
                const args = [...this.fnArgs];
                args[i] = destructiveArgs[j];
                const result = this.runTest(...args);
                results.push(result);
            }
        }
        return {
            status: "success",
            data: results
        };
    }

    private typeCheck(type: any, example: any) {
        if (typeof type === "undefined" || typeof example === "undefined")
            return false;
        if (typeof type === "string") {
            if (type.includes("|")) {
                const typeArr = type.split("|");
                for (const forType of typeArr) {
                    if (this.typeCheck(forType, example)) return true;
                }
            } else {
                type = type.trim();
                const entryInUserDestructives =
                    this._userDestructives && this._userDestructives[type];
                return (
                    (entryInUserDestructives &&
                        Array.isArray(entryInUserDestructives)) ||
                    typeof example === type
                );
            }
        } else if (
            typeof type === "object" &&
            type.constructor.name === "Object"
        ) {
            for (const prop in type) {
                if (!this.typeCheck(type[prop], example[prop])) return false;
            }
            return true;
        }
        return false;
    }

    private buildType(example: unknown) {
        let type: string | object;
        if (typeof example === "undefined")
            return this.sendError("BuildType method requires an argument");
        if (typeof example !== "object") type = typeof example;
        else if (
            example &&
            typeof example === "object" &&
            example.constructor.name === "Object"
        ) {
            type = {};
            for (const prop in example) {
                //@ts-ignore
                const propType = this.buildType(example[prop]);
                //@ts-ignore
                if (propType !== "unknown") type[prop] = propType;
            }
        } else type = "unknown";
        return type;
    }

    private runTest(...args: unknown[]) {
        let error: boolean, response: any;
        const start = Date.now();
        try {
            response = this._fn(...args);
            error = false;
        } catch (e) {
            error = true;
            response = e.message;
        }
        const end = Date.now();
        const result: { matchedReturnType?: boolean } = {};
        if (!error && this.fnReturnValue) {
            result.matchedReturnType = this.typeCheck(
                this.fnReturnType,
                response
            );
        }
        return {
            error,
            output: response,
            timeTaken: end - start + "ms",
            inputs: args,
            ...result
        };
    }

    private sendError(message: string) {
        return this._errorLevel === 1
            ? returnError(message)
            : throwError(message);
    }
}
