import { Destructives, destructiveArgs } from "./utilities";
import { returnError } from "../classes/Error";

function isPrimitive(argType: string) {
    // return ["string", "number", "boolean", "bigint", "symbol"].includes(argType);
    // We would work on more types later
    return ["string", "number", "boolean"].includes(argType);
}

function isValidNumber(
    num: unknown,
    shouldBeGreaterThan = 0,
    shouldBeLessThan = Math.pow(2, 52)
) {
    return (
        typeof num === "number" &&
        num > shouldBeGreaterThan &&
        num < shouldBeLessThan
    );
}

export default function generateArgs(
    argType: unknown,
    argExample?: unknown,
    userDestructives: Partial<Destructives> = {}
) {
    //@ts-ignore
    const destructives: Destructives = {};
    for (const prop in destructiveArgs) {
        //@ts-ignore
        if (Array.isArray(userDestructives[prop])) {
            //@ts-ignore
            destructives[prop] = [].concat(
                //@ts-ignore
                destructiveArgs[prop],
                //@ts-ignore
                userDestructives[prop]
            );
        } else {
            returnError(
                `The values of the ${prop} property in the Destructives object must be an array, using defaults...`
            );
            //@ts-ignore
            destructives[prop] = [...destructiveArgs[prop]];
        }
    }
    let destructiveArgsArr: any[] = Array.isArray(destructives.generals)
        ? [...destructives.generals]
        : [];
    if (typeof argType === "string") {
        const argTypeTrimmed = argType.trim();
        if (argTypeTrimmed.includes("|")) {
            const argTypeArr = argTypeTrimmed.split("|");
            for (const type of argTypeArr) {
                destructiveArgsArr = destructiveArgsArr.concat(
                    generateArgs(type, argExample)
                );
            }
            // @ts-ignore
        } else if (Array.isArray(destructives[argTypeTrimmed])) {
            destructiveArgsArr = destructiveArgsArr.concat(
                // @ts-ignore
                destructives[argTypeTrimmed]
            );
        }
    } else if (
        argType &&
        typeof argType === "object" &&
        argType.constructor.name === "Object"
    ) {
        destructiveArgsArr = destructiveArgsArr.concat(destructives.object);
        for (const prop in argType) {
            // @ts-ignore
            const args = generateArgs(argType[prop], argExample[prop]);
            args.forEach((arg) => {
                destructiveArgsArr.push({
                    ...(argExample as object),
                    [prop]: arg
                });
            });
        }
    } else {
        returnError(`Unknown type ${JSON.stringify(argType)} passed in.`);
    }
    return destructiveArgsArr;
}
