"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Message_1 = require("../models/Message");
const validateToken_1 = require("../middleware/validateToken");
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
router.post("/send", validateToken_1.validateToken, async (req, res) => {
    try {
        const sender = req.user._id;
        const { receiver, content } = req.body;
        if (!sender || !receiver || !content) {
            return res.status(400).json({ error: "Missing fields" });
        }
        const message = new Message_1.Message({
            sender,
            receiver,
            content,
        });
        await message.save();
        await axios_1.default.post("http://localhost:4000/emit", { message });
        res.status(201).json(message);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to send message" });
    }
});
router.get("/history", validateToken_1.validateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { user2 } = req.query;
        if (!user2) {
            return res.status(400).json({ error: "Missing users" });
        }
        const messages = await Message_1.Message.find({
            $or: [
                { sender: userId, receiver: user2 },
                { sender: user2, receiver: userId },
            ],
        }).sort({ createdAt: 1 });
        res.json(messages);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map