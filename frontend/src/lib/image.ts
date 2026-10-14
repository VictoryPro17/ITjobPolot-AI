/**
 * Schneidet ein Bild mittig quadratisch zu und skaliert es auf size x size als JPEG.
 * Das Neuzeichnen auf ein Canvas entfernt dabei Metadaten (EXIF/GPS).
 */
export async function cropToSquareJpeg(file: File, size = 256): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Das Bild konnte nicht gelesen werden.");
  }

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Das Bild konnte nicht gelesen werden.");
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Das Bild konnte nicht gelesen werden."))),
        "image/jpeg",
        0.9,
      );
    });
  } finally {
    bitmap.close();
  }
}
