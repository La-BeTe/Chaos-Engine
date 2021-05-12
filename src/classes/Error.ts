export class ChaosError extends Error {
    constructor(message: string, stack?: string) {
        super(message);
        if (stack) this.stack = stack;
    }
    toJSON() {
        return {
            status: "error" as "error",
            message: this.message
        };
    }
}

export function throwError(message: string, stack?: string): never {
    throw new ChaosError(message, stack);
}

export function returnError(message: string) {
    const error = new ChaosError(message);
    console.log(error.toJSON());
    return error;
}
