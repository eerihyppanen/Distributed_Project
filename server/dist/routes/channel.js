"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const validateToken_1 = require("../middleware/validateToken");
const Channel_1 = require("../models/Channel");
const ChannelMessage_1 = require("../models/ChannelMessage");
const router = express_1.default.Router();
const formatChannelMessage = (message) => ({
    _id: message._id,
    sender: message.sender?._id ? String(message.sender._id) : String(message.sender),
    senderNickname: message.sender?.nickname || "Unknown",
    channel: message.channel,
    content: message.content,
    createdAt: message.createdAt,
});
router.post("/create", validateToken_1.validateToken, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: "Channel name is required" });
        }
        const trimmedName = String(name).trim();
        const existing = await Channel_1.Channel.findOne({ name: trimmedName });
        if (existing) {
            return res.status(409).json({ error: "Channel already exists" });
        }
        const userId = req.user._id;
        const channel = await Channel_1.Channel.create({
            name: trimmedName,
            members: [userId],
        });
        return res.status(201).json({
            success: true,
            channel: { id: channel._id, name: channel.name },
        });
    }
    catch (err) {
        return res.status(500).json({ error: "Failed to create channel" });
    }
});
router.get("/list", validateToken_1.validateToken, async (req, res) => {
    try {
        const userId = String(req.user._id);
        const channels = await Channel_1.Channel.find({}).sort({ name: 1 });
        return res.status(200).json({
            success: true,
            channels: channels.map((channel) => ({
                id: channel._id,
                name: channel.name,
                memberCount: channel.members.length,
                joined: channel.members.some((memberId) => String(memberId) === userId),
            })),
        });
    }
    catch (err) {
        return res.status(500).json({ error: "Failed to list channels" });
    }
});
router.post("/join", validateToken_1.validateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { channelId } = req.body;
        if (!channelId) {
            return res.status(400).json({ error: "channelId is required" });
        }
        const channel = await Channel_1.Channel.findByIdAndUpdate(channelId, { $addToSet: { members: userId } }, { new: true });
        if (!channel) {
            return res.status(404).json({ error: "Channel not found" });
        }
        return res.status(200).json({
            success: true,
            channel: {
                id: channel._id,
                name: channel.name,
                memberCount: channel.members.length,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: "Failed to join channel" });
    }
});
router.get("/messages", validateToken_1.validateToken, async (req, res) => {
    try {
        const userId = String(req.user._id);
        const channelId = String(req.query.channelId || "");
        if (!channelId) {
            return res.status(400).json({ error: "channelId query is required" });
        }
        const channel = await Channel_1.Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ error: "Channel not found" });
        }
        const isMember = channel.members.some((memberId) => String(memberId) === userId);
        if (!isMember) {
            return res.status(403).json({ error: "Join the channel first" });
        }
        const messages = await ChannelMessage_1.ChannelMessage.find({ channel: channelId })
            .populate("sender", "nickname")
            .sort({ createdAt: 1 });
        return res.status(200).json(messages.map(formatChannelMessage));
    }
    catch (err) {
        return res.status(500).json({ error: "Failed to fetch channel messages" });
    }
});
router.post("/send", validateToken_1.validateToken, async (req, res) => {
    try {
        const sender = String(req.user._id);
        const { channelId, content } = req.body;
        if (!channelId || !content) {
            return res.status(400).json({ error: "channelId and content are required" });
        }
        const channel = await Channel_1.Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ error: "Channel not found" });
        }
        const isMember = channel.members.some((memberId) => String(memberId) === sender);
        if (!isMember) {
            return res.status(403).json({ error: "Join the channel first" });
        }
        const message = await ChannelMessage_1.ChannelMessage.create({
            sender,
            channel: channelId,
            content,
        });
        const populatedMessage = await ChannelMessage_1.ChannelMessage.findById(message._id).populate("sender", "nickname");
        if (!populatedMessage) {
            return res.status(500).json({ error: "Failed to load channel message" });
        }
        const formattedMessage = formatChannelMessage(populatedMessage);
        await axios_1.default.post("http://localhost:4000/emit-channel", {
            channelId,
            message: formattedMessage,
        });
        return res.status(201).json(formattedMessage);
    }
    catch (err) {
        return res.status(500).json({ error: "Failed to send channel message" });
    }
});
exports.default = router;
//# sourceMappingURL=channel.js.map