// Input validation utilities

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  // At least 6 characters
  return password && password.length >= 6;
};

const validateTaskInput = (task) => {
  const errors = [];

  if (!task.title || task.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (task.complexity && !['low', 'medium', 'high'].includes(task.complexity)) {
    errors.push('Complexity must be low, medium, or high');
  }

  if (task.priority && !['low', 'medium', 'high', 'urgent'].includes(task.priority)) {
    errors.push('Priority must be low, medium, high, or urgent');
  }

  if (task.estimated_duration && (task.estimated_duration < 1 || task.estimated_duration > 1440)) {
    errors.push('Estimated duration must be between 1 and 1440 minutes');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateTaskInput,
};
