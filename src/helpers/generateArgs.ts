import { Destructives, destructiveArgs, isValidObject } from "./utilities";
import { returnError } from "../classes/Error";

export default function generateArgs(
    argType: unknown,
    argExample: unknown,
    userDestructives: { [x: string]: unknown[] } = {}
) {
    //@ts-ignore
    const destructives: Destructives = { ...userDestructives };
    for (const prop in destructiveArgs) {
        if (Array.isArray(userDestructives[prop])) {
            //@ts-ignore
            destructives[prop] = [].concat(
                //@ts-ignore
                destructiveArgs[prop],
                //@ts-ignore
                userDestructives[prop]
            );
        } else {
            if (userDestructives[prop])
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
    } else if (isValidObject(argType) && isValidObject(argExample)) {
        destructiveArgsArr = destructiveArgsArr.concat(destructives.object);
        for (const prop in argType as object) {
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
    // We don't want duplicate args for union types :-)
    return Array.from(new Set(destructiveArgsArr));
}
