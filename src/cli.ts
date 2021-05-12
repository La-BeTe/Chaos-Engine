#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import CLI from "./classes/CLI";

const argv = yargs(hideBin(process.argv)).argv;
const configLocation = argv.config ? String(argv.config) : "./chaos.config.js";
CLI.init(configLocation);
