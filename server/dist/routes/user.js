"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = require("../models/User");
const validateToken_1 = require("../middleware/validateToken");
const inputValidation_1 = require("../middleware/inputValidation");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
//Routes to create and modify users
const router = (0, express_1.Router)();
exports.default = router;
//Route to register a new account. Checks if user exists already and password and nickname are valid.
router.post("/register", inputValidation_1.nicknameValidator, inputValidation_1.passwordValidator, async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        return res.status(400).json({ error: errors.array()[0]?.msg });
    }
    try {
        const { nickname, password } = req.body;
        if (!nickname || !password) {
            return res.status(400);
        }
        const existing = await User_1.User.findOne({ nickname: nickname });
        if (existing) {
            return res.status(403).json({ error: "this user exists already" });
        }
        const hash = await bcrypt_1.default.hash(password, 6);
        const newUser = await User_1.User.create({
            nickname: nickname,
            password: hash,
        });
        return res.status(200).json({ success: true, user: { id: newUser._id, nickname: newUser.nickname } });
    }
    catch (e) {
        console.error(e);
        res.status(500).send("Internal server error.");
    }
});
//route to login to an existing account.
router.post("/login", inputValidation_1.nicknameValidator, inputValidation_1.passwordValidator, async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        return res.status(400).json({ error: errors.array()[0]?.msg });
    }
    const { nickname, password } = req.body;
    const user = await User_1.User.findOne({ nickname: nickname });
    if (!user) {
        return res.status(404).json({ error: "No user found for this nickname" });
    }
    if (await bcrypt_1.default.compare(password, user.password)) {
        const jwtPayload = {
            _id: user._id,
            nickname: user.nickname
        };
        const token = jsonwebtoken_1.default.sign(jwtPayload, process.env.SECRET, { expiresIn: "1h" });
        return res.status(200).json({ success: true, token: token, user: { nickname: user.nickname, id: user._id } });
    }
    return res.status(401).json({ error: "Login failed" });
});
//route to search users by nickname
router.get("/search", validateToken_1.validateToken, async (req, res) => {
    try {
        const nicknameQuery = String(req.query.nickname || "").trim();
        if (!nicknameQuery) {
            return res.status(400).json({ error: "nickname query is required" });
        }
        const users = await User_1.User.find({
            nickname: { $regex: `^${nicknameQuery}`, $options: "i" }
        })
            .select("_id nickname")
            .limit(10);
        return res.status(200).json({
            success: true,
            users: users.map((user) => ({ id: user._id, nickname: user.nickname }))
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).send("Internal server error.");
    }
});
//route to get a user by id
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id);
        if (!user) {
            return res.status(404).json({ error: "No user found" });
        }
        return res.status(200).json({ success: true, user: user });
    }
    catch (e) {
        console.error(e);
        res.status(500).send("Internal server error.");
    }
});
//route to update accounts information like password.
router.post("/update", validateToken_1.validateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "No user found" });
        }
        const { password, nickname } = req.body;
        const updateFields = {};
        if (nickname) {
            const existing = await User_1.User.findOne({ nickname });
            if (existing && existing._id.toString() !== userId.toString()) {
                return res.status(409).json({ error: "Nickname is already in use" });
            }
            updateFields.nickname = nickname;
        }
        if (password) {
            updateFields.password = await bcrypt_1.default.hash(password, 6);
        }
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ error: "No update data provided" });
        }
        const updatedUser = await User_1.User.findByIdAndUpdate(userId, { $set: updateFields }, { new: true }).select("-password");
        return res.status(200).json({
            success: true,
            user: updatedUser,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).send("Internal server error.");
    }
});
//# sourceMappingURL=user.js.map