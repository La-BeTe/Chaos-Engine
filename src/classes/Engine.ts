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

interface TestResults {
    status: "success" | "error";
    message?: string;
    data?: Result[];
}

export default class Engine {
    private fnReturnValue: unknown;
    private fnReturnType: unknown;
    private readonly fnArgs: unknown[] = [];
    private readonly destructiveArgs: Array<Array<unknown>> = [];
    private isFnAsync = false;

    constructor(
        private _fn?: Function,
        private _errorLevel: 0 | 1 = 0,
        private _userDestructives: { [x: string]: unknown[] } = {}
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
            try {
                this.isFnAsync = fn() instanceof Promise;
            } catch (e) {}
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

    toTake(argExample: unknown, argType?: unknown) {
        if (typeof this.fn !== "function") {
            this.sendError(
                "You have to set the function before passing its arguments."
            );
            return this;
        }
        if (
            typeof argType === "undefined" &&
            typeof argExample === "undefined"
        ) {
            this.sendError("ToTake method requires between 1-2 arguments");
        } else {
            if (typeof argType === "undefined") {
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

    toReturn(returnExample: unknown, returnType?: unknown) {
        if (typeof this.fn !== "function") {
            this.sendError(
                "You have to set the function before passing a return value."
            );
            return this;
        }
        if (
            typeof returnType === "undefined" &&
            typeof returnExample === "undefined"
        ) {
            this.sendError("ToReturn method requires between 1-2 arguments");
        } else {
            if (typeof returnType === "undefined") {
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
        return this;
    }

    run(): TestResults | Promise<TestResults> {
        if (this.fnArgs.length === 0) {
            return this.sendError(
                "You have to call ToTake method at least once before calling the Run method."
            );
        }
        if (this.isFnAsync) {
            return this.runAsync();
        } else {
            const results = this.startTesting(false) as Result[];
            return {
                status: "success",
                data: results
            };
        }
    }

    async runAsync(): Promise<TestResults> {
        if (this.fnArgs.length === 0) {
            return this.sendError(
                "You have to call ToTake method at least once before calling the RunAsync method."
            );
        }
        return {
            status: "success",
            data: await this.startTesting(true)
        };
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

    private startTesting(shouldRunAsync: boolean) {
        const results: (Result | Promise<Result>)[] = [];
        for (let i = 0; i < this.destructiveArgs.length; i++) {
            const destructiveArgs = [...this.destructiveArgs[i]];
            for (let j = 0; j < destructiveArgs.length; j++) {
                const args = [...this.fnArgs];
                args[i] = destructiveArgs[j];
                const result = this.runTest(shouldRunAsync, ...args);
                results.push(result);
            }
        }
        if (!shouldRunAsync) {
            return results as Result[];
        } else {
            return new Promise<Result[]>((resolve, reject) => {
                Promise.all(results)
                    .then((results) => {
                        resolve(results);
                    })
                    .catch((err) => {
                        reject(err.message);
                    });
            });
        }
    }

    private typeCheck(type: any, example: any) {
        if (typeof type === "undefined") return false;
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
        let type: string | object = "object";
        if (typeof example === "undefined")
            return this.sendError("BuildType method requires an argument");
        if (typeof example !== "object") type = typeof example;
        else if (this.validateObject(example)) {
            type = {};
            for (const prop in example) {
                //@ts-ignore
                const propType = this.buildType(example[prop]);
                //@ts-ignore
                type[prop] = propType;
            }
        }
        return type;
    }

    private runTest(...args: unknown[]) {
        let error: boolean, response: any;
        const shouldRunAsync = args.shift();
        if (shouldRunAsync) {
            return new Promise<Result>((resolve) => {
                const start = Date.now();
                (this.fn as Function)(...args)
                    .then((response: unknown) => {
                        const end = Date.now();
                        const result: { matchedReturnType?: boolean } = {};
                        if (typeof this.fnReturnValue !== "undefined") {
                            result.matchedReturnType = this.typeCheck(
                                this.fnReturnType,
                                response
                            );
                        }
                        resolve({
                            error: true,
                            inputs: args,
                            output: response,
                            timeTaken: end - start + "ms",
                            ...result
                        });
                    })
                    .catch((err: Error) => {
                        const end = Date.now();
                        const result: { matchedReturnType?: boolean } = {};
                        if (this.fnReturnValue) {
                            result.matchedReturnType = false;
                        }
                        resolve({
                            error: true,
                            inputs: args,
                            output: err.message,
                            timeTaken: end - start + "ms",
                            ...result
                        });
                    });
            });
        } else {
            const start = Date.now();
            try {
                response = (this.fn as Function)(...args);
                error = false;
            } catch (e) {
                error = true;
                response = e.message;
            }
            const end = Date.now();
            const result: { matchedReturnType?: boolean } = {};
            if (typeof this.fnReturnValue !== "undefined") {
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
            } as Result;
        }
    }

    protected sendError(message: string) {
        const error =
            this.errorLevel === 1 ? returnError(message) : throwError(message);
        return error.toJSON();
    }

    private validateObject(obj: unknown) {
        return isValidObject(obj);
    }
}
