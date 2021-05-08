export interface Destructives {
    string: unknown[];

    number: unknown[];

    boolean: unknown[];

    object: unknown[];

    generals: unknown[];
}

export const destructiveArgs: Destructives = {
    string: ["", "   ", "13467", []],

    number: [-1, Infinity, -Infinity, NaN, 10007199254740992],

    boolean: [1, 0, "", []],

    object: [
        {},
        [],
        {
            destroy: "24"
        },
        2000000000000000000
    ],

    generals: [null, undefined]
};

export function isValidObject(obj: unknown) {
    return !!(
        typeof obj === "object" &&
        obj &&
        obj.constructor.name === "Object"
    );
}
