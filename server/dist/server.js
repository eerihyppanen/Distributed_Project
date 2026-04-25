"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chat_1 = __importDefault(require("./routes/chat"));
const channel_1 = __importDefault(require("./routes/channel"));
const user_1 = __importDefault(require("./routes/user"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 1234;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use("/api/user", user_1.default);
app.use("/api/chat", chat_1.default);
app.use("/api/channel", channel_1.default);
const mongoDB = "mongodb://127.0.0.1:27017/application";
mongoose_1.default.connect(mongoDB);
mongoose_1.default.Promise = Promise;
const db = mongoose_1.default.connection;
db.on("error", console.error.bind(console, "MongoDB connection error"));
const dbStateLabel = (state) => {
    switch (state) {
        case 0:
            return "disconnected";
        case 1:
            return "connected";
        case 2:
            return "connecting";
        case 3:
            return "disconnecting";
        default:
            return "unknown";
    }
};
const probeService = async (name, url) => {
    try {
        const response = await axios_1.default.get(url, { timeout: 1500 });
        return {
            name,
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            data: response.data,
        };
    }
    catch (error) {
        return {
            name,
            ok: false,
            status: error?.response?.status || null,
            error: error?.message || "service probe failed",
        };
    }
};
app.get("/api/system/health", async (_req, res) => {
    const dbState = mongoose_1.default.connection.readyState;
    const dependencies = await Promise.all([
        probeService("socket-server", "http://localhost:4000/health"),
        probeService("presence-service", "http://localhost:5000/health"),
    ]);
    const ok = dbState === 1 && dependencies.every((service) => service.ok);
    return res.status(ok ? 200 : 503).json({
        ok,
        service: "api-server",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
            state: dbStateLabel(dbState),
            readyState: dbState,
        },
        dependencies,
    });
});
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
//# sourceMappingURL=server.js.map