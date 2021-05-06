#!/usr/bin/env node

import { basename, resolve } from "path";
import { chaos } from "./";
import { Result } from "./classes/Engine";
import { throwError } from "./classes/Error";
import Table from "cli-table3";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv)).argv;

interface Config {
    files: {
        [x: string]: {
            inputs: unknown[];
            output: unknown;
            errorLevel: number;
            destructives: {
                [x: string]: unknown[];
            };
        };
    };
    errorLevel: number;
    destructives: {
        [y: string]: unknown[];
    };
}

function handleTests({ files, errorLevel, destructives }: Config) {
    for (const fileName in files) {
        let fn: Function;
        try {
            fn = require(resolve(fileName));
        } catch (e) {
            throwError(
                `Failed to import ${fileName}, \nCaught error: ${e.message}`,
                e.stack
            );
        }
        const fileObj = files[fileName];
        if (
            !fileObj ||
            typeof fileObj !== "object" ||
            fileObj.constructor.name !== "Object"
        )
            throw new Error(
                `The ${fileName} property in the config is not an object`
            );
        let errorLevelArg: Config["errorLevel"] = errorLevel;
        let destructivesArg: Config["destructives"] = { ...destructives };

        if (fileObj.errorLevel) errorLevel = fileObj.errorLevel;

        if (fileObj.destructives) destructivesArg = { ...fileObj.destructives };

        const args = fileObj.inputs;
        if (!args || !Array.isArray(args) || args.length < 1)
            throwError(`Invalid inputs passed in for file '${fileName}'`);
        const chaosEngine = chaos(fn, errorLevelArg as 0 | 1, destructivesArg);
        for (const arg of args) {
            chaosEngine.toTake(arg);
        }

        let result: { status: string; data?: Result[] };
        if (fileObj.output) {
            result = chaosEngine.toReturn(fileObj.output);
        } else {
            result = chaosEngine.run();
        }
        if (result.data && result.status === "success") {
            const errorLogging = buildTable(fileName, result.data);
            if (errorLogging !== "")
                throwError(
                    `Failed to log to table, \nCaught error: ${errorLogging}`
                );
        } else {
            console.log({ result });
            throwError(`Test failed`);
        }
    }
}

function main() {
    let configFile: string = "chaos.config.js";
    let config: Config;
    if (argv.config) configFile = argv.config as string;
    let files: Config["files"],
        errorLevel: Config["errorLevel"],
        destructives: Config["destructives"];
    try {
        config = require(resolve(configFile));
        if (typeof config !== "object")
            throw new Error("Config is not an object");
        files = config.files;
        errorLevel = config.errorLevel || 0;
        destructives = config.destructives || {};
        if (
            !files ||
            typeof files !== "object" ||
            files.constructor.name !== "Object"
        )
            throw new Error("Config Files property is not an object");
        if (errorLevel !== 0 && errorLevel !== 1) {
            console.log(
                `Invalid error level ${errorLevel} passed in, using defaults...`
            );
            errorLevel = 0;
        }
        if (
            typeof destructives !== "object" ||
            destructives.constructor.name !== "Object"
        )
            throw new Error("Config Destructives property is not an object");
    } catch (e) {
        throwError(
            `Failed to parse config from ${configFile}, \nCaught error: ${e.message}`,
            e.stack
        );
    }
    handleTests({ files, destructives, errorLevel });
}

function buildTable(fileName: string, results: Result[]) {
    try {
        const headings: string[] = [];
        Object.keys(results[0]).forEach((str) => {
            let normStr = str
                .toLowerCase()
                .replace(str[0], str[0].toUpperCase());
            if (normStr !== "Error") {
                headings.push(normStr);
            }
        });
        const table = new Table({
            head: ["FileName", ...headings],
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
            table.push([basename(fileName), ...entries]);
        }
        console.log(table.toString());
        return "";
    } catch (e) {
        return e.message;
    }
}

main();
