#!/usr/bin/env node

import { basename, resolve, dirname } from "path";
import Table from "cli-table3";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { chaos } from "./";
import { isValidObject } from "./helpers/utilities";
import { Result } from "./classes/Engine";
import { throwError } from "./classes/Error";

const argv = yargs(hideBin(process.argv)).argv;
const configLocation = argv.config ? String(argv.config) : "chaos.config.js";

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

function handleTests({ files, errorLevel, destructives }: Config) {
    for (const fileName in files) {
        let fn: Function;
        try {
            const fileLocation = resolve(dirname(configLocation), fileName);
            fn = require(fileLocation);
        } catch (e) {
            throwError(
                `Failed to import ${fileName}, \nCaught error: ${e.message}`,
                e.stack
            );
        }
        if (typeof fn !== "function")
            throwError(
                `The file ${basename(fileName)} does not export a function`
            );
        const fileObj = files[fileName];
        if (!isValidObject(fileObj))
            throwError(
                `The ${fileName} property in the config is not an object`
            );
        let errorLevelArg: Config["errorLevel"] = errorLevel;
        let destructivesArg: Config["destructives"] = { ...destructives };

        if (fileObj.errorLevel) errorLevelArg = fileObj.errorLevel;
        if (fileObj.destructives) destructivesArg = { ...fileObj.destructives };

        const args = fileObj.inputs;
        if (!args || !Array.isArray(args) || args.length < 1)
            throwError(`Invalid inputs passed in for file '${fileName}'`);
        const chaosEngine = chaos(fn, errorLevelArg, destructivesArg);
        for (const arg of args) {
            chaosEngine.toTake(arg);
        }
        if (fileObj.output) {
            chaosEngine.toReturn(fileObj.output);
        }
        const result: {
            status: string;
            data?: Result[];
            message?: string;
        } = chaosEngine.run();

        if (result.data) {
            console.log(
                `                   File Name ==> ${basename(fileName)}`
            );
            const errorLogging = buildTable(result.data);
            if (errorLogging !== "")
                throwError(
                    `Failed to log to table, \nCaught error: ${errorLogging}`
                );
        } else if (result.message) {
            throwError(result.message);
        }
    }
}

function main() {
    let config: Config,
        files: Config["files"],
        errorLevel: Config["errorLevel"],
        destructives: Config["destructives"];
    try {
        config = require(resolve(configLocation));
        if (typeof config !== "object")
            throw new Error("Config is not an object");
        files = config.files;
        errorLevel = config.errorLevel || 0;
        destructives = config.destructives || {};
        if (!isValidObject(files))
            throw new Error("Config Files property is not an object");
        if (errorLevel !== 0 && errorLevel !== 1) {
            console.log(
                `Invalid error level ${errorLevel} passed in, using defaults...`
            );
            errorLevel = 0;
        }
        if (!isValidObject(destructives))
            throw new Error("Config Destructives property is not an object");
    } catch (e) {
        throwError(
            `Failed to parse config from ${configLocation}, \nCaught error: ${e.message}`,
            e.stack
        );
    }
    handleTests({ files, destructives, errorLevel });
}

function buildTable(results: Result[]) {
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
                let jsonEntry = JSON.stringify(value).slice(0, 80);
                if (entry.toLowerCase() === "output" && result.error) {
                    jsonEntry = `ERROR: ${jsonEntry}`;
                }
                if (entry.toLowerCase() !== "error") entries.push(jsonEntry);
            });
            table.push([...entries]);
        }
        console.log(table.toString());
        return "";
    } catch (e) {
        return e.message;
    }
}

main();
