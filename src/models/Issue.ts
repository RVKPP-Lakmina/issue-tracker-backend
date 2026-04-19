import { Schema, model, type Types } from "mongoose";

export type IssueStatus = "open" | "in-progress" | "closed" | "on-hold";
export type IssuePriority = "low" | "medium" | "high" | "critical";

export interface IIssue {
    title: string;
    description: string;
    status: IssueStatus;
    priority: IssuePriority;
    project?: Types.ObjectId | null;
    parentIssue?: Types.ObjectId | null;
    assignedTo?: Types.ObjectId | null;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const issueSchema = new Schema<IIssue>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        status: {
            type: String,
            enum: ["open", "in-progress", "closed", "on-hold"],
            default: "open"
        },
        priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
        project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
        parentIssue: { type: Schema.Types.ObjectId, ref: "Issue", default: null },
        assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
    },
    { timestamps: true }
);

issueSchema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: any) => {
        ret.id = String(ret._id);
        delete ret._id;
    }
});

issueSchema.set("toObject", {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: any) => {
        ret.id = String(ret._id);
        delete ret._id;
    }
});

export const Issue = model<IIssue>("Issue", issueSchema);
