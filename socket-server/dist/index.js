"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
});
const users = new Map();
const socketToUser = new Map();
const channelRoom = (channelId) => `channel:${channelId}`;
const PRESENCE_URL = "http://localhost:5000";
const notifyPresence = async (path, payload) => {
    try {
        await axios_1.default.post(`${PRESENCE_URL}${path}`, payload);
    }
    catch {
        // Presence is non-critical; socket delivery should continue even if this call fails.
    }
};
app.get("/health", (_req, res) => {
    return res.status(200).json({
        ok: true,
        service: "socket-server",
        connectedUsers: users.size,
        trackedSockets: socketToUser.size,
    });
});
io.on("connection", (socket) => {
    console.log("Connected:", socket.id);
    socket.on("register", async ({ userId, nickname }) => {
        if (!userId || !nickname) {
            return;
        }
        users.set(userId, socket.id);
        socketToUser.set(socket.id, userId);
        await notifyPresence("/user/online", { userId, nickname });
    });
    socket.on("join_channel", async ({ userId, channelId }) => {
        if (channelId && userId) {
            socket.join(channelRoom(channelId));
            await notifyPresence("/channel/join", { userId, channelId });
        }
    });
    socket.on("leave_channel", async ({ userId, channelId }) => {
        if (channelId && userId) {
            socket.leave(channelRoom(channelId));
            await notifyPresence("/channel/leave", { userId, channelId });
        }
    });
    socket.on("disconnect", async () => {
        const userId = socketToUser.get(socket.id);
        if (userId) {
            users.delete(userId);
            socketToUser.delete(socket.id);
            await notifyPresence("/user/offline", { userId });
        }
        else {
            for (const [mappedUserId, id] of users.entries()) {
                if (id === socket.id) {
                    users.delete(mappedUserId);
                    await notifyPresence("/user/offline", { userId: mappedUserId });
                }
            }
        }
    });
});
app.post("/emit", (req, res) => {
    const { message } = req.body;
    const socketId = users.get(message.receiver);
    if (socketId) {
        io.to(socketId).emit("new_message", message);
    }
    res.sendStatus(200);
});
app.post("/emit-channel", (req, res) => {
    const { channelId, message } = req.body;
    if (!channelId || !message) {
        return res.status(400).json({ error: "channelId and message are required" });
    }
    io.to(channelRoom(channelId)).emit("channel_message", message);
    return res.sendStatus(200);
});
server.listen(4000, () => {
    console.log("Socket server running on 4000");
});
//# sourceMappingURL=index.js.map