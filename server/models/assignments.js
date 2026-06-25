import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    description: { type: String, default: '' },
    studentId:   { type: String, required: true },
    dueDate:     { type: Date, required: true },
    createdBy:   { type: String },
    status:      { type: String, enum: ['assigned', 'completed'], default: 'assigned' },
    grade:       { type: Number },
    weight:      { type: Number },
    course:      { type: String },
  },
  { timestamps: true }
);

export const Assignment = mongoose.model('Assignment', assignmentSchema);
