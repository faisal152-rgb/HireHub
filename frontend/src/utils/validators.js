export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password) => {
  // Min 6 characters, at least 1 letter and 1 number
  return password && password.length >= 6;
};

export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export const isValidPhone = (phone) => {
  const phoneRegex = /^[+0-9\s-]{10,15}$/;
  return phoneRegex.test(phone);
};
