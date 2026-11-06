const ImageKit = require("@imagekit/nodejs");

let imageKitInstance = null;

function getImageKit() {
  if (imageKitInstance) {
    return imageKitInstance;
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "Company IMAGEKIT_PRIVATE_KEY environment variable is not defined"
    );
  }

  imageKitInstance = new ImageKit({
    privateKey,
  });

  console.log("Company ImageKit Client Initialized");

  return imageKitInstance;
}

function connectImagekit() {
  return getImageKit();
}

module.exports = {
  getImageKit,
  connectImagekit,
};