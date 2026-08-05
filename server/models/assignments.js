import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 5000 },
    studentId:   { type: String, required: true, trim: true, maxlength: 100 },
    dueDate:     { type: Date, required: true },
    createdBy:   { type: String },
    status:      { type: String, enum: ['assigned', 'completed'], default: 'assigned' },
    grade:       { type: Number, min: 0, max: 100 },
    weight:      { type: Number, min: 0, max: 100 },
    course:      { type: String, trim: true, maxlength: 100 },
  },
  { timestamps: true }
);

export const Assignment = mongoose.model('Assignment', assignmentSchema);
