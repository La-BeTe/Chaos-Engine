import generateArgs from "../helpers/generateArgs";
import { throwError, returnError } from "./Error";
import { destructiveArgs, isValidObject } from "../helpers/utilities";

export interface Result {
    matchedReturnType?: boolean;
    error: boolean;
    output: unknown;
    timeTaken: string;
    inputs: unknown[];
}

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

    get defaultDestructives() {
        const result: { [x: string]: any[] } = {};
        for (const each in destructiveArgs) {
            //@ts-ignore
            const args = destructiveArgs[each];
            if (Array.isArray(args)) result[each] = [...args];
        }
        return { ...result };
    }

    get destructives() {
        const result: { [x: string]: any[] } = {};
        for (const each in this._userDestructives) {
            if (Array.isArray(this._userDestructives[each]))
                result[each] = [...this._userDestructives[each]];
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
        if (!this.validateObject(destructives)) {
            this.sendError(
                `Expected an object argument for setDestructives method, got '${JSON.stringify(
                    destructives
                )}'`
            );
            destructives = {};
        }
        for (const each in destructives) {
            const arr = destructives[each];
            if (Array.isArray(arr)) result[each] = [...arr];
            else
                this.sendError(
                    `Expected an array for each destructive property, got '${JSON.stringify(
                        arr
                    )}'`
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
        if (errorLevel !== this.errorLevel) {
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
        if (typeof this.fn !== "function") {
            this.sendError(
                "You have to set the function before passing its arguments."
            );
            return this;
        }
        if (typeof argType === "undefined") {
            this.sendError("ToTake method requires between 1-2 arguments");
        } else {
            if (typeof argExample === "undefined") {
                argExample = argType;
                argType = this.buildType(argExample);
            }
            if (this.typeCheck(argType, argExample)) {
                this.destructiveArgs.push(
                    this.generateArgs(argType, argExample)
                );
                this.fnArgs.push(argExample);
            } else {
                this.sendError(
                    `ToTake expects the example ${JSON.stringify(
                        argExample
                    )} to have type ${JSON.stringify(argType)}`
                );
            }
        }
        return this;
    }

    toReturn(returnType: unknown, returnExample?: unknown) {
        if (typeof this.fn !== "function") {
            return this.sendError(
                "You have to set the function before passing a return value."
            );
        }
        if (typeof returnType === "undefined") {
            this.sendError("ToReturn method requires between 1-2 arguments");
        } else {
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
        }
        return this.run();
    }

    run() {
        if (this.fnArgs.length === 0) {
            return this.sendError(
                "You have to call ToTake method at least once before calling the Run method."
            );
        }
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
        return this;
    }

    private generateArgs(argType: unknown, argExample?: unknown) {
        return generateArgs(argType, argExample, this._userDestructives);
    }

    private startTesting() {
        const results: Result[] = [];
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
                const customEntryInUserDestructives =
                    this.destructives && this.destructives[type];
                const isAnUnknownType = !this.defaultDestructives[type];
                return (
                    (isAnUnknownType &&
                        customEntryInUserDestructives &&
                        Array.isArray(customEntryInUserDestructives)) ||
                    typeof example === type
                );
            }
        } else if (this.validateObject(type)) {
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
        else if (this.validateObject(example)) {
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

    private runTest(...args: unknown[]): Result {
        let error: boolean, response: any;
        const start = Date.now();
        try {
            response = this.fn(...args);
            error = false;
        } catch (e) {
            error = true;
            response = e.message;
        }
        const end = Date.now();
        const result: { matchedReturnType?: boolean } = {};
        if (this.fnReturnValue) {
            result.matchedReturnType = this.typeCheck(
                this.fnReturnType,
                response
            );
            if (error) result.matchedReturnType = false;
        }
        return {
            error,
            inputs: args,
            output: response,
            timeTaken: end - start + "ms",
            ...result
        };
    }

    private sendError(message: string) {
        return this.errorLevel === 1
            ? returnError(message)
            : throwError(message);
    }

    private validateObject(obj: unknown) {
        return isValidObject(obj);
    }
}
