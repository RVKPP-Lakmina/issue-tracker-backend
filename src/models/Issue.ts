import { Schema, model, type Types } from "mongoose";

export type IssueStatus = "open" | "in-progress" | "closed" | "on-hold";
export type IssuePriority = "low" | "medium" | "high" | "critical";

export interface IIssue {
    title: string;
    description: string;
    status: IssueStatus;
    priority: IssuePriority;
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
        assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
    },
    { timestamps: true }
);

export const Issue = model<IIssue>("Issue", issueSchema);
