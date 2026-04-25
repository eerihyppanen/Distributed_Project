"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelMessage = void 0;
const mongoose_1 = require("mongoose");
const ChannelMessageSchema = new mongoose_1.Schema({
    sender: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    channel: { type: mongoose_1.Schema.Types.ObjectId, ref: "Channel", required: true },
    content: { type: String, required: true },
}, {
    timestamps: true,
});
exports.ChannelMessage = (0, mongoose_1.model)("ChannelMessage", ChannelMessageSchema);
//# sourceMappingURL=ChannelMessage.js.map