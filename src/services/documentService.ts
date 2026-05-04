import { supabase } from "../config/supabase";
import { env } from "../config/env";
import { AppError } from "../types";

export const uploadToStorage = async (params: {
  clinicId: string;
  patientId: string;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
  folder: string;
}) => {
  if (!env.SUPABASE_STORAGE_BUCKET) {
    throw new AppError(500, "Storage not configured", "Bucket missing");
  }

  const path = `clinic-${params.clinicId}/patients/${params.patientId}/${params.folder}/${Date.now()}-${params.fileName}`;

  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(path, params.fileBuffer, {
      contentType: params.contentType,
      upsert: false,
    });

  if (error) {
    throw new AppError(500, "Upload failed", error.message);
  }

  const { data } = supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl,
  };
};
