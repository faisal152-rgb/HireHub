export const validateResumeFile = (file, maxSizeMB = 5) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only PDF or DOCX format is allowed.' };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: File size must be under MB. };
  }

  return { valid: true };
};

export const validateImageFile = (file, maxSizeMB = 2) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPG, PNG or WebP images are allowed.' };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: Image size must be under MB. };
  }

  return { valid: true };
};
