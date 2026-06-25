import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    role:      { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
