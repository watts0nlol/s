import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true, maxlength: 200 },
    code:       { type: String, required: true, trim: true, maxlength: 50 },
    joinCode:   { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 12 },
    teacherId:  { type: String, required: true, trim: true, maxlength: 100, index: true },
    studentIds: { type: [String], default: [] },
    active:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

courseSchema.index({ studentIds: 1, active: 1 });

export const Course = mongoose.model('Course', courseSchema);
