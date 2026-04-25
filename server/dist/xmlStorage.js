"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readXML = readXML;
exports.writeXML = writeXML;
const fs_1 = __importDefault(require("fs"));
const xml2js_1 = require("xml2js");
const DB_FILE = "notes.xml";
async function readXML() {
    const data = fs_1.default.readFileSync(DB_FILE, "utf8");
    return await (0, xml2js_1.parseStringPromise)(data);
}
async function writeXML(obj) {
    const builder = new xml2js_1.Builder();
    const xml = builder.buildObject(obj);
    fs_1.default.writeFileSync(DB_FILE, xml);
}
//# sourceMappingURL=xmlStorage.js.map