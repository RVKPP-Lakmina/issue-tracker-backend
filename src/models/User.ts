import bcrypt from "bcryptjs";
import { Schema, model, type HydratedDocument, type Model } from "mongoose";
import { env } from "../config/env";

export type UserRole = "admin" | "user";

export interface IUser {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserMethods {
    comparePassword: (candidatePassword: string) => Promise<boolean>;
}

export type UserDocument = HydratedDocument<IUser, IUserMethods>;
type UserModel = Model<IUser, object, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, minlength: 8 },
        role: { type: String, enum: ["admin", "user"], default: "user" },
        avatar: { type: String }
    },
    { timestamps: true }
);

userSchema.pre("save", async function hashPassword() {
    if (!this.isModified("password")) {
        return;
    }

    this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword: string) {
    return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser, UserModel>("User", userSchema);
