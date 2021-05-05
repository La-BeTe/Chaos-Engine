import generateArgs from "../../src/helpers/generateArgs";
import { destructiveArgs } from "../../src/helpers/utilities";

describe("Generate Args", () => {
    it("should not accept strings other than 'string', 'number' and 'boolean'", () => {
        const args = generateArgs("array");
        expect(args).toHaveLength(destructiveArgs.generals.length);
    });

    it("should return an array of the type of arg passed in", () => {
        const args = generateArgs("string");
        expect(args).toHaveLength(
            destructiveArgs.string.length + destructiveArgs.generals.length
        );
    });
});
