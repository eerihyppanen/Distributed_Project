"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const port = 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const onlineUsers = new Map();
const channelMembers = new Map();
app.get("/health", (_req, res) => {
    return res.status(200).json({
        ok: true,
        onlineUsers: onlineUsers.size,
        channelsTracked: channelMembers.size,
    });
});
app.post("/user/online", (req, res) => {
    const { userId, nickname } = req.body;
    if (!userId || !nickname) {
        return res.status(400).json({ error: "userId and nickname are required" });
    }
    onlineUsers.set(String(userId), String(nickname));
    return res.sendStatus(204);
});
app.post("/user/offline", (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: "userId is required" });
    }
    const userIdStr = String(userId);
    onlineUsers.delete(userIdStr);
    for (const members of channelMembers.values()) {
        members.delete(userIdStr);
    }
    return res.sendStatus(204);
});
app.post("/channel/join", (req, res) => {
    const { userId, channelId } = req.body;
    if (!userId || !channelId) {
        return res.status(400).json({ error: "userId and channelId are required" });
    }
    const channelIdStr = String(channelId);
    const userIdStr = String(userId);
    const currentMembers = channelMembers.get(channelIdStr) || new Set();
    currentMembers.add(userIdStr);
    channelMembers.set(channelIdStr, currentMembers);
    return res.sendStatus(204);
});
app.post("/channel/leave", (req, res) => {
    const { userId, channelId } = req.body;
    if (!userId || !channelId) {
        return res.status(400).json({ error: "userId and channelId are required" });
    }
    const channelIdStr = String(channelId);
    const userIdStr = String(userId);
    const currentMembers = channelMembers.get(channelIdStr);
    if (currentMembers) {
        currentMembers.delete(userIdStr);
        if (currentMembers.size === 0) {
            channelMembers.delete(channelIdStr);
        }
    }
    return res.sendStatus(204);
});
app.get("/online-users", (_req, res) => {
    const users = Array.from(onlineUsers.entries()).map(([id, nickname]) => ({
        id,
        nickname,
    }));
    return res.status(200).json({
        success: true,
        users,
    });
});
app.get("/channel/:channelId/members", (req, res) => {
    const channelId = String(req.params.channelId || "");
    if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
    }
    const members = Array.from(channelMembers.get(channelId) || []).map((userId) => ({
        id: userId,
        nickname: onlineUsers.get(userId) || "Offline",
        online: onlineUsers.has(userId),
    }));
    return res.status(200).json({
        success: true,
        channelId,
        members,
    });
});
app.listen(port, () => {
    console.log(`Presence service running on port ${port}`);
});
//# sourceMappingURL=index.js.map