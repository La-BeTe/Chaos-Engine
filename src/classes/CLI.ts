import path from "path";
import Table from "cli-table3";
import Engine, { Result } from "./Engine";
import { throwError } from "./Error";
import { isValidObject } from "../helpers/utilities";

interface Config {
    files: {
        [x: string]: {
            inputs: unknown[];
            output?: unknown;
            errorLevel?: 0 | 1;
            destructives?: {
                [x: string]: unknown[];
            };
        };
    };
    errorLevel?: 0 | 1;
    destructives?: {
        [y: string]: unknown[];
    };
}

export default class CLI extends Engine {
    private static CLI: CLI;

    private constructor(
        private readonly config: Config,
        private readonly configLocation = ""
    ) {
        super();
        this.validateConfig();
        this.startTests();
    }

    get files() {
        return this.config && this.config.files;
    }

    private log(...args: any[]) {
        return console.log("\n", ...args);
    }

    private validateConfig() {
        if (!isValidObject(this.config)) throwError("Config is not an object");
        this.setErrorLevel(this.config.errorLevel!);
        this.setDestructives(this.config.destructives!);
        if (!isValidObject(this.files))
            throwError("Config Files property is not an object");
        this.log("Successfully validated configuration options");
    }

    private async startTests(index = 0) {
        // We're using recursive method instead of loops here so the promises and console logs are properly arranged
        const filesKeys = Object.keys(this.files);
        if (index < filesKeys.length) {
            const name = filesKeys[index];
            await this.testHandler({
                name,
                file: this.files[name]
            });
            this.startTests(index + 1);
        }
    }

    private async testHandler({
        name: fileName,
        file
    }: {
        name: string;
        file: Config["files"]["x"];
    }) {
        this.log(`Starting tests on ${path.basename(fileName).toUpperCase()}`);
        let fn: Function;
        try {
            const configDir = path.dirname(this.configLocation);
            const fileLocation = path.resolve(configDir, fileName);
            fn = require(fileLocation);
        } catch (e) {
            return this.sendError(
                `Failed to import ${fileName}, \nCaught error: ${e.message}`
            );
        }
        if (typeof fn !== "function")
            return this.sendError(
                `The file ${path.basename(fileName)} does not export a function`
            );
        this.setFn(fn);

        if (!isValidObject(file))
            return this.sendError(
                `The ${fileName} property in the config is not an object`
            );
        if (file.errorLevel) this.setErrorLevel(file.errorLevel);
        if (file.destructives) {
            const result = { ...this.config.destructives },
                destructives = file.destructives;
            for (const each in destructives) {
                const arr = destructives[each];
                if (Array.isArray(arr))
                    result[each] = [...arr, ...(result[each] || [])];
                else
                    this.sendError(
                        `Expected an array for each destructive property, got '${JSON.stringify(
                            arr
                        )}'`
                    );
            }
            this.setDestructives(result);
        }

        const args = file.inputs;
        if (!args || !Array.isArray(args) || args.length < 1)
            return this.sendError(
                `Invalid inputs passed in for file '${fileName}'`
            );
        for (const arg of args) {
            if (Array.isArray(arg) && arg.length === 2)
                this.toTake(arg[0], arg[1]);
            else this.toTake(arg);
        }
        if (file.output) {
            const arg = file.output;
            if (Array.isArray(arg) && arg.length === 2)
                this.toReturn(arg[0], arg[1]);
            else this.toReturn(arg);
        }
        const result = await this.run();
        if (result.data) {
            const errorLogging = this.buildTable(result.data);
            if (errorLogging !== "")
                this.sendError(
                    `Failed to log to table, \nCaught error: ${errorLogging}`
                );
        } else if (result.message) {
            this.sendError(result.message);
        }
    }

    private buildTable(results: Result[]) {
        try {
            const headings: string[] = [];
            Object.keys(results[0]).forEach((str) => {
                let normStr = str.replace(str[0], str[0].toUpperCase());
                if (normStr !== "Error") {
                    headings.push(normStr);
                }
            });
            const table = new Table({
                head: [...headings],
                chars: {
                    top: "═",
                    "top-mid": "╤",
                    "top-left": "╔",
                    "top-right": "╗",
                    bottom: "═",
                    "bottom-mid": "╧",
                    "bottom-left": "╚",
                    "bottom-right": "╝",
                    left: "║",
                    "left-mid": "╟",
                    mid: "─",
                    "mid-mid": "┼",
                    right: "║",
                    "right-mid": "╢",
                    middle: "│"
                }
            });
            for (const result of results) {
                const entries: any[] = [];
                Object.keys(result).forEach((entry) => {
                    //@ts-ignore
                    const value = result[entry];
                    let jsonEntry = JSON.stringify(value, (key, value) => {
                        if (value !== value) {
                            return "NaN";
                        }

                        if (value === Infinity) {
                            return "Infinity";
                        }
                        if (value === undefined) {
                            return "undefined";
                        }
                        if (value === -Infinity) {
                            return "-Infinity";
                        }
                        return value;
                    }).slice(0, 80);
                    if (entry.toLowerCase() === "output" && result.error) {
                        jsonEntry = `ERROR: ${jsonEntry}`;
                    }
                    if (entry.toLowerCase() !== "error")
                        entries.push(jsonEntry);
                });
                table.push([...entries]);
            }
            this.log(table.toString());
            return "";
        } catch (e) {
            return e.message;
        }
    }

    static init(configLocation: string) {
        try {
            const config = require(path.resolve(configLocation));
            this.CLI = new CLI(config, configLocation);
        } catch (e) {
            throwError(
                `Failed to parse config from ${configLocation}, \nCaught error: ${e.message}`,
                e.stack
            );
        }
    }
}
