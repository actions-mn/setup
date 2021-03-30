"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installMetanormaVersion = void 0;
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const IS_WINDOWS = process.platform === 'win32';
const IS_MACOSX = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';
function download(url, path) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`url: ${url}`);
        const res = yield node_fetch_1.default(url);
        yield new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(path);
            res.body.pipe(fileStream);
            res.body.on('error', err => {
                reject(err);
            });
            fileStream.on('finish', function () {
                resolve();
            });
        });
    });
}
function installMetanormaVersion(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let cmd = null;
        if (IS_MACOSX) {
            cmd = 'brew install metanorma/metanorma/metanorma';
        }
        else if (IS_LINUX) {
            cmd = 'sudo snap install metanorma';
        }
        else if (IS_WINDOWS) {
            if (version && version !== '') {
                cmd = `choco install metanorma --yes --no-progress --version ${version}`;
            }
            else {
                cmd = 'choco install metanorma --yes --no-progress';
            }
        }
        if (cmd) {
            yield exec.exec(cmd);
        }
        else {
            throw new Error(`Unsupported platform ${process.platform}`);
        }
    });
}
exports.installMetanormaVersion = installMetanormaVersion;
