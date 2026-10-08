const ImageKit = require("@imagekit/nodejs");

function getImageKit() {
        const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("IMAGEKIT_PRIVATE_KEY environment variable is not defined");
        }
        else {
            console.log(`✅ IMAGEKIT Connected Successfully`);
        }
        imagekitInstance = new ImageKit({
            privateKey: privateKey,
        });
    }
module.exports= getImageKit;