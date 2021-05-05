import { chaosify } from "../../src";
import { ChaosError } from "../../src/classes/Error";
import ChaosEngine from "../../src/classes/Engine";

function sum(a: number, b: number) {
    return a + b;
}

describe("Chaos Engine", () => {
    it("should accept only functions and return a new Chaos Engine", () => {
        //@ts-ignore
        expect(() => chaosify("")).toThrowError(ChaosError);
        //@ts-ignore
        expect(() => chaosify(1)).toThrow(ChaosError);
        expect(() => chaosify(sum)).not.toThrow();
        expect(chaosify(sum)).toBeInstanceOf(ChaosEngine);
    });
});
