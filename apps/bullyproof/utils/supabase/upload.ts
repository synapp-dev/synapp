import { createBrowserClient } from "./client";

/**
 * Generates a public URL for a topic slide based on its storage path structure.
 *
 * Files are stored in: slides/topics/s{stage}/t{topic}/{slideId}.{extension}
 * This function reconstructs the path and generates the public URL.
 *
 * @param slideId - The ID of the topic_slides row
 * @param stageNumber - The stage number (e.g., 1, 2, 3)
 * @param topicNumber - The topic number within the stage (e.g., 1, 2, 3)
 * @param extension - The file extension (e.g., "jpg", "png", "webp")
 * @returns The public URL for the slide image
 */
export function getSlideImagePublicUrl(
  slideId: string,
  stageNumber: number,
  topicNumber: number,
  extension: string = "jpg"
): string {
  const supabase = createBrowserClient();

  // Construct path: slides/topics/s{stage}/t{topic}/{slideId}.{extension}
  const fileName = `${slideId}.${extension}`;
  const filePath = `slides/topics/s${stageNumber}/t${topicNumber}/${fileName}`;

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("content").getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Uploads an image file to Supabase Storage and returns the public URL.
 *
 * Files are stored in a structured path: slides/topics/s{stage}/t{topic}/{slideId}.{extension}
 * This makes it easier to generate public URLs since we know the stage, topic, and slide ID.
 *
 * If a file with the same slideId already exists, it will be renamed with a timestamp
 * (e.g., {slideId}-{timestamp}.{extension}) before uploading the new file.
 *
 * @param file - The file to upload
 * @param slideId - The ID of the topic_slides row (used as filename)
 * @param stageNumber - The stage number (e.g., 1, 2, 3)
 * @param topicNumber - The topic number within the stage (e.g., 1, 2, 3)
 * @returns The public URL of the uploaded file
 * @throws Error if upload fails
 */
export async function uploadSlideImage(
  file: File,
  slideId: string,
  stageNumber: number,
  topicNumber: number
): Promise<string> {
  const supabase = createBrowserClient();

  // Get file extension
  const fileExtension = file.name.split(".").pop() || "jpg";

  // Construct path: slides/topics/s{stage}/t{topic}/{slideId}.{extension}
  // Note: Supabase Storage automatically creates intermediate folders if they don't exist
  const fileName = `${slideId}.${fileExtension}`;
  const filePath = `slides/topics/s${stageNumber}/t${topicNumber}/${fileName}`;

  // Try to rename existing file with timestamp if it exists
  // This preserves old versions while allowing the new upload
  const timestamp = Date.now();
  const oldFileName = `${slideId}-${timestamp}.${fileExtension}`;
  const oldFilePath = `slides/topics/s${stageNumber}/t${topicNumber}/${oldFileName}`;

  // Attempt to move/rename the existing file (if it exists)
  // If the file doesn't exist, this will fail, which is fine - we'll just upload the new one
  const { error: renameError } = await supabase.storage
    .from("content")
    .move(filePath, oldFilePath);

  // If rename fails and it's not because the file doesn't exist, try deleting it
  // This ensures we can upload the new file even if rename isn't supported
  if (renameError) {
    // Check if error is due to file not existing (various possible error messages)
    const errorMessage = renameError.message?.toLowerCase() || "";
    const isNotFoundError =
      errorMessage.includes("not found") ||
      errorMessage.includes("does not exist");

    if (!isNotFoundError) {
      // File exists but rename failed - try to delete it as fallback
      const { error: deleteError } = await supabase.storage
        .from("content")
        .remove([filePath]);

      if (deleteError) {
        console.warn(
          `Failed to rename/delete existing file: ${renameError.message}. Proceeding with upload anyway.`
        );
      }
    }
    // If it's a "not found" error, that's fine - the file doesn't exist, so we can proceed
  }

  // Upload the new file (with upsert: true to ensure it overwrites if rename failed)
  const { data, error } = await supabase.storage
    .from("content")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true, // Allow overwriting in case rename didn't work
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("content").getPublicUrl(filePath);

  if (!publicUrl) {
    throw new Error("Failed to get public URL for uploaded file");
  }

  return publicUrl;
}
