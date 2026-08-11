import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, trim: true, maxlength: 100, index: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    createdBy: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { timestamps: true }
);

announcementSchema.index({ courseId: 1, createdAt: -1 });

export const Announcement = mongoose.model('Announcement', announcementSchema);
