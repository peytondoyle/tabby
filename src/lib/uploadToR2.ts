/**
 * Upload a file to Cloudflare R2 using presigned URLs
 *
 * @param file - The File object to upload
 * @returns Promise with the public URL of the uploaded file
 */
export async function uploadToR2(file: File): Promise<string> {
  // Step 1: Get presigned URL from our API
  const signResponse = await fetch('/api/r2/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });

  if (!signResponse.ok) {
    throw new Error('Failed to get presigned URL');
  }

  const { presignedUrl, publicUrl } = await signResponse.json();

  // Step 2: Upload file directly to R2 using presigned URL
  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file to R2');
  }

  // Step 3: Return the public URL
  return publicUrl;
}
