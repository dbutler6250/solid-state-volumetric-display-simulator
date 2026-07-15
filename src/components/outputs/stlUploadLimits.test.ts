import { describe, expect, it } from 'vitest';
import { MAX_STL_FILE_BYTES } from '../../simulation/slicer/limits';
import { getStlUploadSizeError } from './stlUploadLimits';

describe('getStlUploadSizeError', () => {
  it('rejects files above the browser-side upload limit', () => {
    expect(getStlUploadSizeError(MAX_STL_FILE_BYTES)).toBeNull();
    expect(getStlUploadSizeError(MAX_STL_FILE_BYTES + 1)).toContain('maximum upload size is 15 MB');
  });
});
