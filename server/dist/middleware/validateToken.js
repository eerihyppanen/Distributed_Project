"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const validateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;
    const cookieToken = req.cookies?.token;
    const token = cookieToken || bearerToken;
    if (token) {
        try {
            const verified = jsonwebtoken_1.default.verify(token, process.env.SECRET);
            req.user = verified;
            next();
        }
        catch (err) {
            return res.status(401).json({ error: "Invalid token" });
        }
    }
    else {
        return res.status(401).json({ error: "No token provided" });
    }
};
exports.validateToken = validateToken;
//# sourceMappingURL=validateToken.js.map