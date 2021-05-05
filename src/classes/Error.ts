export class ChaosError extends Error {
    constructor(message: string) {
        super(message);
    }
    toJSON() {
        return {
            status: "error",
            message: this.message,
            stack: this.stack
        };
    }
}

export function throwError(message: string): never {
    throw new ChaosError(message);
}

export function returnError(message: string) {
    const error = new ChaosError(message).toJSON();
    console.log(error);
    return error;
}
