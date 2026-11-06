const {getImageKit} = require("../config/imagekit");
const { toFile } = require("@imagekit/nodejs");

function normalizeFile(file) {
    if (Buffer.isBuffer(file)) {
        return { buffer: file, fileName: "upload", mimeType: "application/octet-stream" };
    }
    if (typeof file === "string") {
        const match = file.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
            throw new Error("Image must be a multipart file or a base64 data URL");
        }

        return {
            buffer: Buffer.from(match[2], "base64"),
            fileName: `upload.${match[1].split("/")[1] || "bin"}`,
            mimeType: match[1],
        };

    }

    if (file && file.buffer) {
        return {
            buffer: file.buffer,
            fileName: file.originalname || "upload",
            mimeType: file.mimetype || "application/octet-stream",
        };
    }
   
    throw new Error("Image file is required");
}

const uploadFile = async (file, folder = "HireHub") => {
    const normalized = normalizeFile(file);
    const imageFile = await toFile(normalized.buffer, normalized.fileName, {
        type: normalized.mimeType,
    });
    return getImageKit().files.upload({
        file: imageFile,
        fileName: normalized.fileName,
        folder: `HireHub/${folder}`,
    });
};

const deleteFile = async (fileId) => {
    if (!fileId) {
        throw new Error("ImageKit file ID is required to delete a file");
    }
    await getImageKit().files.delete(fileId);
    return { message: "File deleted successfully" };
};

// ImageKit's update API changes metadata, not file contents. Upload the
// replacement and let callers persist the returned URL.
const updateFile = (file, folder = "HireHub") => uploadFile(file, folder);

module.exports = { uploadFile, deleteFile, updateFile };