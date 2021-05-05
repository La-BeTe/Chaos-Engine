import ChaosEngine from "../../src/classes/Engine";
import { destructiveArgs } from "../../src/helpers/utilities";

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

    it("should have a setFn method that changes the function to test and throws if an invalid function is passed in", () => {
        const chaosEngine = new ChaosEngine(sum);
        expect(chaosEngine.fn).toEqual(sum);
        const newFn = () => {};
        chaosEngine.setFn(newFn);
        expect(chaosEngine.fn).toEqual(newFn);
        //@ts-ignore
        expect(() => chaosEngine.setFn(23)).toThrowError(
            "Chaos Engine expects a function argument"
        );
    });

    it("should have a setErrorLevel method that changes the errorLevel, determining if it should throw errors or log them", () => {
        const chaosEngine = new ChaosEngine(sum);
        expect(chaosEngine.errorLevel).toEqual(0);
        chaosEngine.setErrorLevel(1);
        expect(chaosEngine.errorLevel).toEqual(1);
    });

    it("should have a setDestructives method that can be used to change the user-provided detructives for testing", () => {
        const chaosEngine = new ChaosEngine(sum, 1, customDestructives);
        expect(chaosEngine.destructives).toStrictEqual(customDestructives);
        chaosEngine.setDestructives({});
        expect(chaosEngine.destructives).toEqual({});
        chaosEngine.setDestructives({ test: [1, 2, 3] });
        expect(chaosEngine.destructives).toEqual({ test: [1, 2, 3] });
    });

    it("should not include the user-provided destructives if they are not valid arrays", () => {
        const chaosEngine = new ChaosEngine(sum, 1, customDestructives);
        expect(chaosEngine.destructives).toStrictEqual(customDestructives);
        //@ts-ignore
        chaosEngine.setDestructives({ test: 23 });
        expect(chaosEngine.destructives.test).toBeUndefined;
        //@ts-ignore
        chaosEngine.setDestructives({ test: "  test  " });
        expect(chaosEngine.destructives.test).toBeUndefined;
    });

    it("should use the default error level if an invalid number is passed in", () => {
        const chaosEngine = new ChaosEngine(sum, 1);
        expect(chaosEngine.errorLevel).toEqual(1);
        //@ts-ignore
        chaosEngine.setErrorLevel("");
        expect(chaosEngine.errorLevel).toEqual(0);
    });

    it("should have a refresh method that resets the Engine instance", () => {
        const chaosEngine = new ChaosEngine(sum, 1, customDestructives);
        expect(chaosEngine.fn).toEqual(sum);
        expect(chaosEngine.errorLevel).toEqual(1);
        expect(chaosEngine.destructives).toStrictEqual(customDestructives);
        chaosEngine.refresh();
        expect(chaosEngine.fn).toBeUndefined;
        expect(chaosEngine.errorLevel).toEqual(0);
        expect(chaosEngine.destructives).toStrictEqual({});
    });

    it("should have a toTake method that returns the chaosEngine allowing for chaining", () => {
        const chaosEngine = new ChaosEngine(sum);
        expect(chaosEngine.toTake("number", 3)).toStrictEqual(chaosEngine);
        expect(
            chaosEngine.toTake("number", 5).toTake("number", 7)
        ).toStrictEqual(chaosEngine);
    });

    it("should have a toTake method that throws if the function to be tested has not been set", () => {
        const chaosEngine = new ChaosEngine();
        expect(() => chaosEngine.toTake("number", 3)).toThrowError(
            "You have to set the function before passing its arguments."
        );
        expect(chaosEngine.setErrorLevel(1).toTake("number", 2)).toStrictEqual(
            chaosEngine
        );
        chaosEngine.setFn(sum);
        expect(() => chaosEngine.toTake("number", 3)).not.toThrow();
    });

    it("should have a toTake method that returns the engine instance if errorLevel is 1 and an error is thrown", () => {
        const chaosEngine = new ChaosEngine();
        expect(chaosEngine.setErrorLevel(1).toTake("number", 2)).toStrictEqual(
            chaosEngine
        );
        chaosEngine.setFn(sum);
        expect(() => chaosEngine.toTake("number", 3)).not.toThrow();
    });

    it("should have a toReturn method that returns results of the tests", () => {
        const chaosEngine = new ChaosEngine(sum);
        const result = chaosEngine
            .toTake("number", 4)
            .toTake("number", 4)
            .toReturn("number", 8);
        expect(result).toHaveProperty("status", "success");
        expect(result).toHaveProperty("data");
        //@ts-ignore
        expect(result.data).toHaveLength(
            // Multiplying by 2 below because the sum function used for testing takes two numbers
            (destructiveArgs.number.length + destructiveArgs.generals.length) *
                2
        );
    });

    it("should deduce the argument type if a single argument is passed to toReturn or toTake methods", () => {
        const chaosEngine = new ChaosEngine(sum);
        const result = chaosEngine.toTake(4).toTake(4).toReturn(8);
        expect(result).toHaveProperty("status", "success");
        expect(result).toHaveProperty("data");
        //@ts-ignore
        expect(result.data).toHaveLength(
            // Multiplying by 2 below because the sum function used for testing takes two numbers
            (destructiveArgs.number.length + destructiveArgs.generals.length) *
                2
        );
    });

    it("should also deduce types for object schemas", () => {
        const chaosEngine = new ChaosEngine(sum);
        const result = chaosEngine
            .toTake({
                a: 5,
                b: {
                    c: "hello"
                }
            })
            .toTake(4)
            .run();
        expect(result).toHaveProperty("status", "success");
        expect(result).toHaveProperty("data");
        //@ts-ignore
        expect(result.data).toHaveLength(
            // Multiplying by 2 below because the sum function used for testing takes two numbers
            destructiveArgs.object.length * 2 +
                destructiveArgs.string.length +
                destructiveArgs.number.length * 2 +
                destructiveArgs.generals.length * 5
        );
    });

    it("should also work with union types", () => {
        const chaosEngine = new ChaosEngine(sum);
        const result = chaosEngine
            .toTake("string | number", 4)
            .toTake("string | number", 4)
            .toReturn("string | number", 8);
        expect(result).toHaveProperty("status", "success");
        expect(result).toHaveProperty("data");
        //@ts-ignore
        expect(result.data).toHaveLength(
            (destructiveArgs.number.length +
                destructiveArgs.generals.length +
                destructiveArgs.string.length) *
                2
        );
    });

    it("should throw an error if the type argument to toTake or toReturn does not match the example", () => {
        const chaosEngine = new ChaosEngine(sum);
        expect(() => chaosEngine.toTake("number", "hello")).toThrow();
        expect(() =>
            chaosEngine.toTake("string", "true").toReturn("string", true)
        ).toThrow();
    });

    it("should throw an error if the run method is called without calling toTake initially or passing a function to test", () => {
        const chaosEngine = new ChaosEngine(sum);
        expect(() => chaosEngine.run()).toThrowError(
            "You have to call ToTake method at least once before calling the Run method."
        );
    });

    it("should include the user-provided destructives in its tests", () => {
        customDestructives.number = [3, 0, 9];
        const chaosEngine = new ChaosEngine(sum, 0, customDestructives);
        const result = chaosEngine
            .toTake("number", 4)
            .toTake("number", 4)
            .toReturn("number", 8);
        expect(result).toHaveProperty("status", "success");
        expect(result).toHaveProperty("data");
        //@ts-ignore
        expect(result.data).toHaveLength(
            // Multiplying by 2 below because the sum function used for testing takes two numbers
            (destructiveArgs.number.length +
                destructiveArgs.generals.length +
                customDestructives.number.length) *
                2
        );
    });

    it("should include the user-provided destructives even if they are not part of the inbuilt indestructives", () => {
        customDestructives.random = [3, 0, 9];
        const chaosEngine = new ChaosEngine(sum, 0, customDestructives);
        const result = chaosEngine
            .toTake("number", 4)
            .toTake("random", 4)
            .toReturn("number", 8);
        expect(result).toHaveProperty("status", "success");
        expect(result).toHaveProperty("data");
        //@ts-ignore
        expect(result.data).toHaveLength(
            destructiveArgs.number.length +
                customDestructives.random.length +
                destructiveArgs.generals.length * 2
        );
    });

    it("should have a toReturn method that throws if the function to be tested has not been set or no arguments were specified with the toTake method", () => {
        const chaosEngine = new ChaosEngine();
        expect(() => chaosEngine.toReturn("number", 3)).toThrow();
        chaosEngine.setFn(sum);
        expect(() => chaosEngine.toReturn("number", 3)).toThrow();
    });

    it("should not throw error if errorLevel is set to 1", () => {
        const chaosEngine = new ChaosEngine(sum, 1, customDestructives);
        //@ts-ignore
        expect(() => chaosEngine.setFn(23)).not.toThrowError(
            "Chaos Engine expects a function argument"
        );
    });
});
