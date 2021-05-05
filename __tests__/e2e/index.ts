import { chaosify } from "../../src";
import { ChaosError } from "../../src/classes/Error";
import ChaosEngine from "../../src/classes/Engine";

function sum(a: number, b: number) {
    return a + b;
}
let customDestructives: { [x: string]: unknown[] };

describe("Chaos Engine", () => {
    beforeEach(() => {
        customDestructives = {
            string: ["hello", 89, {}],
            object: [
                67,
                [],
                {
                    a: [0, 9],
                    b: "hello"
                }
            ]
        };
    });

    it("should accept only functions and return a new Chaos Engine", () => {
        //@ts-ignore
        expect(() => chaosify("")).toThrowError(ChaosError);
        //@ts-ignore
        expect(() => chaosify(1)).toThrow(ChaosError);
        expect(() => chaosify(sum)).not.toThrow();
        expect(chaosify(sum)).toBeInstanceOf(ChaosEngine);
    });

    it("should accept errorLevel and custom destructives from user", () => {
        expect(() => new ChaosEngine(sum, 0, customDestructives)).not.toThrow();
        const chaosEngine = new ChaosEngine(sum, 0, customDestructives);
        expect(chaosEngine).toBeInstanceOf(ChaosEngine);
        expect(chaosEngine.destructives).toStrictEqual(customDestructives);
        expect(chaosEngine.fn).toEqual(sum);
        expect(chaosEngine.errorLevel).toEqual(0);
    });

    it("should also accept objects", () => {
        expect(() =>
            chaosify({
                fn: sum,
                errorLevel: 0,
                destructives: customDestructives
            })
        ).not.toThrow();
        const chaosEngine = chaosify({
            fn: sum,
            errorLevel: 0,
            destructives: customDestructives
        });
        expect(chaosEngine).toBeInstanceOf(ChaosEngine);
        expect(chaosEngine.destructives).toStrictEqual(customDestructives);
        expect(chaosEngine.fn).toEqual(sum);
        expect(chaosEngine.errorLevel).toEqual(0);
    });
});
