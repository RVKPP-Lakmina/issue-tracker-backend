import { Schema, model, type Types } from "mongoose";

export type TimeEntryActivity = "analysis" | "implementation" | "testing" | "review" | "meeting";

export interface ITimeEntry {
    issue: Types.ObjectId;
    project?: Types.ObjectId | null;
    user: Types.ObjectId;
    date: Date;
    hours: number;
    activity: TimeEntryActivity;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}

const timeEntrySchema = new Schema<ITimeEntry>(
    {
        issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
        project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        date: { type: Date, required: true },
        hours: { type: Number, required: true, min: 0.01 },
        activity: {
            type: String,
            enum: ["analysis", "implementation", "testing", "review", "meeting"],
            required: true
        },
        comment: { type: String, required: true, trim: true }
    },
    { timestamps: true }
);

timeEntrySchema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: any) => {
        ret.id = String(ret._id);
        delete ret._id;
    }
});

timeEntrySchema.set("toObject", {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: any) => {
        ret.id = String(ret._id);
        delete ret._id;
    }
});

export const TimeEntry = model<ITimeEntry>("TimeEntry", timeEntrySchema);