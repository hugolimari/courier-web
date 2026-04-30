/**
 * Supabase Storage service — handles delivery proof image uploads.
 *
 * The Supabase Project URL is safe to include in source code (not a secret).
 * The Anon Key is loaded from VITE_SUPABASE_ANON_KEY (set in .env files,
 * never committed to git).
 */

const SUPABASE_PROJECT_URL = 'https://batfkdiklqauwmfvvhvj.supabase.co';
const BUCKET = 'delivery-proofs';

function getAnonKey(): string {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!key) {
    throw new Error(
      'Supabase Anon Key no configurada. ' +
      'Agrega VITE_SUPABASE_ANON_KEY a tu archivo .env y a las variables de Vercel.'
    );
  }
  return key;
}

/**
 * Uploads a compressed image blob to the `delivery-proofs` Supabase bucket.
 *
 * File path inside the bucket: `{packageId}/{timestamp}.jpg`
 * This groups all proofs for the same package under one folder.
 *
 * @param packageId - The package UUID (used as folder name in the bucket)
 * @param imageBlob - The compressed JPEG blob from imageCompressor.ts
 * @returns The public URL of the uploaded file
 */
export async function uploadDeliveryProof(
  packageId: string,
  imageBlob: Blob
): Promise<string> {
  const anonKey = getAnonKey();
  const filePath = `${packageId}.jpg`;
  const uploadUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/${BUCKET}/${filePath}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'image/jpeg',
      // x-upsert: false — prevent overwriting an existing proof by accident
      'x-upsert': 'false',
    },
    body: imageBlob,
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const body = await response.json();
      errorMessage = body.message ?? body.error ?? errorMessage;
    } catch {
      // JSON parse failed, keep statusText
    }
    throw new Error(`Error al subir la evidencia fotográfica: ${errorMessage}`);
  }

  // Construct and return the public read URL
  const publicUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
  return publicUrl;
}
