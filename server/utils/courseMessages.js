export const publicCourseMessage = (message) => ({
  _id: String(message._id),
  course: String(message.courseId),
  message: message.message,
  sender: {
    userId: String(message.senderId),
    firstName: message.senderFirstName,
    lastName: message.senderLastName,
    role: message.senderRole,
  },
  createdAt: message.createdAt,
});
