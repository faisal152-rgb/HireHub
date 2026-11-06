const { Worker } = require("bullmq");
const connectRedis = require("../../config/redis");
const Company = require("../../models/auth/Company");
const Job = require("../../models/Job");
const Recruiter = require("../../models/Recruiter");
const { uploadFile } = require("../../service/upload");

function restoreFile(file) {
  if (file?.type === "Buffer" && Array.isArray(file.data)) {
    return Buffer.from(file.data);
  }

  if (file?.buffer?.type === "Buffer" && Array.isArray(file.buffer.data)) {
    return { ...file, buffer: Buffer.from(file.buffer.data) };
  }

  return file;
}

const imageWorker = new Worker(
  "imageQueue",
  async (job) => {
    const { file, targetType, targetId } = job.data || {};
    const restoredFile = restoreFile(file);

    if (!restoredFile || !targetId) {
      throw new Error(`Invalid image upload data for job ${job.id}`);
    }
    if (!["company", "job", "recruiter"].includes(targetType)) {
      throw new Error(`Unsupported image target "${targetType}" for job ${job.id}`);
    }

    const folder =
      targetType === "company"
        ? "Company"
        : targetType === "job"
          ? "jobs"
          : "Recruiter";
    const uploadedFile = await uploadFile(restoredFile, folder);

    if (!uploadedFile?.url) {
      throw new Error(`ImageKit did not return a URL for job ${job.id}`);
    }

    if (targetType === "company") {
      const company = await Company.findByIdAndUpdate(
        targetId,
        { logo: uploadedFile.url },
        { new: true, runValidators: true }
      );
      if (!company) {
        throw new Error(`Company ${targetId} was not found`);
      }

      try {
        await connectRedis.del(`company:${targetId}:profile`);
        await connectRedis.del(`company:${targetId}:publicProfile`);
      } catch (cacheError) {
        console.warn("[Company ImageWorker] Company cache invalidation failed:", cacheError.message);
      }
    } else if (targetType === "job") {
      const updatedJob = await Job.findByIdAndUpdate(
        targetId,
        { image: uploadedFile.url, imageFileId: uploadedFile.fileId || "" },
        { new: true, runValidators: true }
      );
      if (!updatedJob) {
        throw new Error(`Job ${targetId} was not found`);
      }

      try {
        await connectRedis.del(`job:${targetId}`);
      } catch (cacheError) {
        console.warn("[Company ImageWorker] Job cache invalidation failed:", cacheError.message);
      }
    } else {
      const recruiter = await Recruiter.findByIdAndUpdate(
        targetId,
        {
          profilePicture: {
            url: uploadedFile.url,
            publicId: uploadedFile.fileId || "",
          },
        },
        { new: true, runValidators: true }
      );
      if (!recruiter) {
        throw new Error(`Recruiter ${targetId} was not found`);
      }

      try {
        await connectRedis.del(`recruiter:${targetId}`);
        await connectRedis.del(`recruiter:${targetId}:profile`);
        const companyId = recruiter.companyId?._id || recruiter.companyId;
        if (companyId) {
          await connectRedis.del(`company:${companyId}:recruiter:${targetId}`);
          const recruiterKeys = await connectRedis.keys(`company:${companyId}:recruiters*`);
          if (recruiterKeys.length > 0) {
            await connectRedis.del(...recruiterKeys);
          }
        }
      } catch (cacheError) {
        console.warn("[Company ImageWorker] Recruiter cache invalidation failed:", cacheError.message);
      }
    }

    return { success: true, targetType, targetId, url: uploadedFile.url };
  },
  { connection: connectRedis }
);

imageWorker.on("completed", (job) => {
  console.log(`[Company ImageWorker] Job ${job.id} completed`);
});

imageWorker.on("failed", (job, error) => {
  console.error(`[Company ImageWorker] Job ${job?.id} failed:`, error.message);
});

imageWorker.on("error", (error) => {
  console.warn("[Company ImageWorker] Worker connection issue:", error.message);
});

module.exports = { imageWorker };