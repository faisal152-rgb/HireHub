const ImageKit = require("../config/imagekit");

const uploadFile=async(file)=>{
    try {
        const fileBuffer=file.buffer;
        const fileName=file.originalname;
        
        const result = await ImageKit.upload({
            file: fileBuffer,
            fileName: fileName,
            folder: "HireHub", // Optional: organize files in a folder
        });

        return result;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

const deleteFile = async (fileId) => {
    try {
        await ImageKit.deleteFile(fileId);
        return {message:"File deleted successfully"};
    } catch (error) {
        console.log(error);
        throw error;
    }
}

const updataFile = async (fileId, file) => {
    try {
        const fileBuffer=file.buffer;
        const fileName=file.originalname;
        
        const result = await ImageKit.updateFile(fileId, fileBuffer, fileName);
        return result;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports = { uploadFile, deleteFile,updataFile };