export const canAccessCourse = (course, user) => {
  if (!course || !user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'teacher') return String(course.teacherId) === String(user.userId);
  return user.role === 'student' && course.studentIds?.some((id) => String(id) === String(user.userId));
};

export const canManageCourse = (course, user) =>
  Boolean(course && user && (user.role === 'admin' || (user.role === 'teacher' && String(course.teacherId) === String(user.userId))));

export const publicCourse = (course, user) => {
  const value = typeof course.toObject === 'function' ? course.toObject() : { ...course };
  value.enrollmentCount = value.studentIds?.length || 0;
  if (user.role === 'student') {
    delete value.joinCode;
    delete value.studentIds;
  }
  return value;
};
