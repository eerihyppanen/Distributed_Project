"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const xmlStorage_1 = require("./xmlStorage");
const router = express_1.default.Router();
const generateNoteName = (text, index) => {
    const shortText = text.length > 20 ? text.slice(0, 20) : text;
    return `${shortText}${index !== undefined ? " " + index : ""}`;
};
router.post("/note", async (req, res) => {
    try {
        const { topic, text } = req.body;
        if (!topic || !text)
            return res.status(400).json({ error: "Topic and text are required" });
        const timestamp = new Date().toISOString();
        const db = await (0, xmlStorage_1.readXML)();
        if (!db.data)
            db.data = {};
        if (!db.data.topic)
            db.data.topic = [];
        let topicObj = db.data.topic.find((t) => t.$.name === topic);
        if (!topicObj) {
            topicObj = { $: { name: topic }, note: [] };
            db.data.topic.push(topicObj);
        }
        if (!topicObj.note)
            topicObj.note = [];
        const noteName = generateNoteName(text, topicObj.note.length + 1);
        topicObj.note.push({
            $: { name: noteName },
            text: [text],
            timestamp: [timestamp],
        });
        await (0, xmlStorage_1.writeXML)(db);
        res.json({ message: "Note saved", topic, noteName, timestamp });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save note" });
    }
});
router.get("/note/:topic", async (req, res) => {
    try {
        const topicName = req.params.topic;
        const db = await (0, xmlStorage_1.readXML)();
        const topics = db.data?.topic || [];
        const topicObj = topics.find((t) => t.$.name === topicName);
        if (!topicObj || !topicObj.note)
            return res.json([]);
        const notes = topicObj.note.map((n) => ({
            name: n.$.name,
            text: n.text[0],
            timestamp: n.timestamp[0],
        }));
        res.json(notes);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch notes" });
    }
});
router.get("/wiki/:topic", async (req, res) => {
    try {
        const topic = req.params.topic;
        const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=${encodeURIComponent(topic)}&prop=extracts&exintro=true&explaintext=true&redirects=1`;
        const response = await fetch(url);
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        }
        catch (err) {
            console.error("Wikipedia returned non-JSON:", text.slice(0, 500));
            return res.status(500).json({ error: "Wikipedia did not return valid JSON" });
        }
        const pages = data.query?.pages;
        if (!pages)
            return res.json({ title: "", extract: "", link: "" });
        const pageId = Object.keys(pages)[0];
        if (!pageId) {
            return res.json({ title: "", extract: "", link: "" });
        }
        const page = pages[pageId];
        if (!page || page.missing !== undefined) {
            return res.json({ title: "", extract: "", link: "" });
        }
        const extractText = page.extract || "No description available";
        const wikiResult = {
            title: page.title,
            extract: extractText,
            link: `https://en.wikipedia.org/?curid=${page.pageid}`,
        };
        const db = await (0, xmlStorage_1.readXML)();
        if (!db.data)
            db.data = {};
        if (!db.data.topic)
            db.data.topic = [];
        let topicObj = db.data.topic.find((t) => t.$.name === topic);
        if (!topicObj) {
            topicObj = { $: { name: topic }, note: [] };
            db.data.topic.push(topicObj);
        }
        if (!topicObj.note)
            topicObj.note = [];
        const noteName = `Wikipedia: ${wikiResult.title}`;
        topicObj.note.push({
            $: { name: noteName },
            text: [wikiResult.extract],
            timestamp: [new Date().toISOString()],
        });
        await (0, xmlStorage_1.writeXML)(db);
        res.json(wikiResult);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Wikipedia search failed" });
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map