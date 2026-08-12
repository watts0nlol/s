import mongoose from 'mongoose';

const courseMessageSchema = new mongoose.Schema({
  courseId: { type: String, required: true, trim: true, maxlength: 100, index: true },
  senderId: { type: String, required: true, trim: true, maxlength: 100 },
  senderFirstName: { type: String, required: true, trim: true, maxlength: 100 },
  senderLastName: { type: String, required: true, trim: true, maxlength: 100 },
  senderRole: { type: String, required: true, enum: ['student', 'teacher', 'admin'] },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });

courseMessageSchema.index({ courseId: 1, createdAt: -1 });

export const CourseMessage = mongoose.model('CourseMessage', courseMessageSchema);
