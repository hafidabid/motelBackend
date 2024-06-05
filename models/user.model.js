const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        firstName: {
            type: String,
            default: "",
            required: false,
        },
        lastName: {
            type: String,
            default: "",
            required: false,
        },
    },
    birthDate: {
        type: String,
        default: "0000/00/00",
    },
    emailId: {
        type: String,
        default: null,
        required: false,
        nullable: true,
        unique: true
    },
    ethAddress: {
        type: String,
        required: true,
        unique: true
    },
    nonce: {
        type: String,
        default: null,
        required: true,
        nullable: false,
        unique: true
    },
    password: {
        type: String,
        default: "",
        required: false,
    },
    accessToken: {
        type: String,
        default: "",
        required: false,
    },
    refreshToken: {
        type: String,
        default: "",
        required: false,
    },
    role: {
        type: String,
        default: "visitors",
    },
    profileImg: {
        type: String
    },
    profileDetails: {
        profileType: {
            type: String,
            default: "visitors"
        },
        profile: {
            school: {
                name: {
                    type: String
                },
                value: {
                    type: String
                }
            },
            profession: {
                name: {
                    type: String
                },
                value: {
                    type: String
                }
            },
            presentAddress: {
                name: {
                    type: String
                },
                value: {
                    type: String
                }
            },
            favoriteSong: {
                name: {
                    type: String
                },
                value: {
                    type: String
                }
            },
            obsessedWith: {
                name: {
                    type: String
                },
                value: {
                    type: String
                }
            },
            funFact: {
                name: {
                    type: String
                },
                value: {
                    type: String
                }
            },
            spendTime: {
                name: {
                    type: String
                },
                value: {
                    type: String
                }
            },
            pets: {
                name: {
                    type: String
                },
                value: {
                    type: String
                }
            }
        },
        about: {
            type: String
        },
    }
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

const User = mongoose.model("User", userSchema, "users");

module.exports = User;