import { body } from "express-validator";

//input validators for nickname and password

export const nicknameValidator = body("nickname")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Nickname must be between 3 and 20 characters")
    .matches(/^[A-Za-z0-9_]+$/)
    .withMessage("Nickname can contain only letters, numbers, and underscores");

export const passwordValidator = body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .matches(/[#!&?]/)
    .withMessage("Password must contain at least one special character (# ! & ?)");
