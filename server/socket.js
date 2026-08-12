import jwt from 'jsonwebtoken';
import { Course } from './models/courses.js';
import { User } from './models/users.js';
import { canAccessCourse } from './utils/courseAccess.js';

const currentSocketUser = async (userId) => {
  const user = await User.findById(userId, '-password').lean();
  if (!user) return null;
  return {
    userId: String(user._id),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
};

export const authenticateSocket = async (socket, next) => {
  const token = socket.handshake?.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await currentSocketUser(decoded.userId);
    if (!user) return next(new Error('Invalid or expired token'));
    socket.data.user = user;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
};

export const authorizeSocketCourse = async (courseId, user) => {
  if (typeof courseId !== 'string' || !courseId.trim()) return null;
  try {
    const currentUser = await currentSocketUser(user?.userId);
    if (!currentUser) return null;
    const course = await Course.findById(courseId).lean();
    return canAccessCourse(course, currentUser) ? course : null;
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

  socket.on('courseMessage', async (data) => {
    if (
      typeof data?.course !== 'string' ||
      data.course !== socket.data.currentCourseId ||
      typeof data.message !== 'string' ||
      !data.message.trim()
    ) return;
    const course = await authorizeSocketCourse(data.course, socket.data.user);
    if (!course) {
      socket.leave(`course:${data.course}`);
      socket.data.currentCourseId = null;
      return;
    }
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
