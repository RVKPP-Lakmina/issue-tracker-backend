import { Schema, model, type Types } from "mongoose";

export type ProjectStatus = "planning" | "active" | "on-hold" | "closed";

export interface IProject {
    name: string;
    code?: string;
    description?: string;
    status: ProjectStatus;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
    {
        name: { type: String, required: true, trim: true },
        code: { type: String, trim: true, uppercase: true },
        description: { type: String, trim: true },
        status: {
            type: String,
            enum: ["planning", "active", "on-hold", "closed"],
            default: "active"
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
    },
    { timestamps: true }
);

projectSchema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: any) => {
        ret.id = String(ret._id);
        delete ret._id;
    }
});

projectSchema.set("toObject", {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: any) => {
        ret.id = String(ret._id);
        delete ret._id;
    }
});

export const Project = model<IProject>("Project", projectSchema);