import { UPLOAD_LIMIT_BYTES } from "@/lib/image/uploadLimits";
import { FileWithPath } from "react-dropzone";
import { z } from "zod";

const maxMb = Math.round(UPLOAD_LIMIT_BYTES / (1024 * 1024));

/** Accept any image type from the browser; server normalizes via Sharp. */
export const mediaSchema = z.record(
  z.string(),
  z
    .custom<FileWithPath>()
    .refine((file) => !file || file.size <= UPLOAD_LIMIT_BYTES, {
      message: `Each image must be ${maxMb} MB or smaller.`,
    })
    .refine((file) => !file || file.type?.startsWith("image"), {
      message: "Only image files are allowed.",
    }),
);
