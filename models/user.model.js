const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        firstName: {
            type: String,
            default: "",
            required: true,
        },
        lastName: {
            type: String,
            default: "",
            required: true,
        },
    },
    birthDate: {
        type: String,
        default: "00/00/0000",
    },
    emailId: {
        type: String,
        default: "",
        required: true,
        unique: true
    },
    password: {
        type: String
    },
    role: {
        type: String,
        default: "user",
    },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

const User = mongoose.model("User", userSchema, "users");

module.exports = User;