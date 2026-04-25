"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Channel = void 0;
const mongoose_1 = require("mongoose");
const ChannelSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    members: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
}, {
    timestamps: true,
});
exports.Channel = (0, mongoose_1.model)("Channel", ChannelSchema);
//# sourceMappingURL=Channel.js.map