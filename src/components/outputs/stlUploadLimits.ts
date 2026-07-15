import { MAX_STL_FILE_BYTES } from '../../simulation/slicer/limits';

/** Returns a user-facing upload error when the selected STL exceeds the browser-side limit. */
export function getStlUploadSizeError(fileSize: number): string | null {
  if (!Number.isFinite(fileSize) || fileSize < 0) {
    return 'The STL file could not be read.';
  }
  if (fileSize > MAX_STL_FILE_BYTES) {
    return `The STL file is too large. The maximum upload size is ${(MAX_STL_FILE_BYTES / (1024 * 1024)).toFixed(0)} MB.`;
  }
  return null;
}
