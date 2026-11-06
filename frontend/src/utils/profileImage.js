function getImageUrl(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value.url === "string") return value.url.trim();
  return "";
}

export function getProfileImageUrl(profile) {
  if (!profile || typeof profile !== "object") return "";

  return (
    getImageUrl(profile.profilePicture) ||
    getImageUrl(profile.image) ||
    getImageUrl(profile.avatar) ||
    getImageUrl(profile.logo)
  );
}
