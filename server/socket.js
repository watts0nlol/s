import jwt from 'jsonwebtoken';
import { Course } from './models/courses.js';
import { canAccessCourse } from './utils/courseAccess.js';

export const authenticateSocket = (socket, next) => {
  const token = socket.handshake?.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.data.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
};

export const authorizeSocketCourse = async (courseId, user) => {
  if (typeof courseId !== 'string' || !courseId.trim()) return null;
  try {
    const course = await Course.findById(courseId).lean();
    return canAccessCourse(course, user) ? course : null;
  } catch {
    return null;
  }
};

export const registerSocketHandlers = (io, socket) => {
  socket.on('joinCourse', async (courseId) => {
    if (socket.data.currentCourseId) {
      socket.leave(`course:${socket.data.currentCourseId}`);
      socket.data.currentCourseId = null;
    }
    const course = await authorizeSocketCourse(courseId, socket.data.user);
    if (course) {
      socket.data.currentCourseId = String(course._id);
      socket.join(`course:${course._id}`);
    }
  });

  socket.on('courseMessage', (data) => {
    if (
      typeof data?.course !== 'string' ||
      data.course !== socket.data.currentCourseId ||
      typeof data.message !== 'string' ||
      !data.message.trim()
    ) return;
    io.to(`course:${data.course}`).emit('courseMessage', data.message.trim());
  });

  const notificationTimer = setTimeout(() => {
    socket.emit('notification', 'New assignment announcement posted!');
  }, 5000);

  socket.on('disconnect', () => {
    clearTimeout(notificationTimer);
    console.log('User disconnected');
  });
};
