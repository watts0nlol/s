export const getPriority = (daysLeft) => {
  if (daysLeft <= 1) return "CRITICAL";
  if (daysLeft <= 3) return "HIGH";
  return "MEDIUM";
};
