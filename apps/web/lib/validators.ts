import { MediaType } from "@/types/api";

export const MEDIA_LIMITS = {
  image: {
    maxBytes: 25 * 1024 * 1024, // 25 MB
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    allowedMimes: ["image/jpeg", "image/png", "image/webp"],
  },
  audio: {
    maxBytes: 50 * 1024 * 1024, // 50 MB
    allowedExtensions: [".wav", ".mp3", ".m4a"],
    allowedMimes: ["audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a"],
  },
  video: {
    maxBytes: 150 * 1024 * 1024, // 150 MB
    allowedExtensions: [".mp4", ".mov"],
    allowedMimes: ["video/mp4", "video/quicktime"],
  },
} as const;

export interface FileValidationResult {
  valid: boolean;
  mediaType?: MediaType;
  error?: string;
}

export function detectMediaTypeFromExtension(filename: string): MediaType | null {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (MEDIA_LIMITS.image.allowedExtensions.includes(ext as any)) return "image";
  if (MEDIA_LIMITS.audio.allowedExtensions.includes(ext as any)) return "audio";
  if (MEDIA_LIMITS.video.allowedExtensions.includes(ext as any)) return "video";
  return null;
}

export function validateFileHeader(file: File): FileValidationResult {
  const mediaType = detectMediaTypeFromExtension(file.name);
  if (!mediaType) {
    return {
      valid: false,
      error: `Unsupported file extension. Supported formats: JPG, PNG, WEBP, WAV, MP3, M4A, MP4, MOV.`,
    };
  }

  const limit = MEDIA_LIMITS[mediaType];
  if (file.size > limit.maxBytes) {
    const maxMb = limit.maxBytes / (1024 * 1024);
    return {
      valid: false,
      mediaType,
      error: `File size exceeds the maximum limit of ${maxMb} MB for ${mediaType} files.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      mediaType,
      error: "File is empty (0 bytes). Please select a valid media file.",
    };
  }

  return { valid: true, mediaType };
}

/**
 * Sniffs client-side magic bytes from the first 16 bytes of the file
 */
export async function verifyMagicBytes(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const slice = file.slice(0, 16);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (!reader.result || !(reader.result instanceof ArrayBuffer)) {
        return resolve(false);
      }
      const arr = new Uint8Array(reader.result);

      // PNG: 89 50 4E 47
      if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47) {
        return resolve(true);
      }
      // JPEG: FF D8 FF
      if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
        return resolve(true);
      }
      // WEBP: RIFF .... WEBP
      if (
        arr[0] === 0x52 &&
        arr[1] === 0x49 &&
        arr[2] === 0x46 &&
        arr[3] === 0x46 &&
        arr[8] === 0x57 &&
        arr[9] === 0x45 &&
        arr[10] === 0x42 &&
        arr[11] === 0x50
      ) {
        return resolve(true);
      }
      // WAV: RIFF .... WAVE
      if (
        arr[0] === 0x52 &&
        arr[1] === 0x49 &&
        arr[2] === 0x46 &&
        arr[3] === 0x46 &&
        arr[8] === 0x57 &&
        arr[9] === 0x41 &&
        arr[10] === 0x56 &&
        arr[11] === 0x45
      ) {
        return resolve(true);
      }
      // MP3: ID3 or 0xFF 0xFB/F3/F2
      if (arr[0] === 0x49 && arr[1] === 0x44 && arr[2] === 0x33) return resolve(true);
      if (arr[0] === 0xff && (arr[1] & 0xe0) === 0xe0) return resolve(true);

      // MP4 / MOV: ftyp box at offset 4
      if (arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) {
        return resolve(true);
      }
      // QuickTime .mov moov/mdat/wide box
      if (
        (arr[4] === 0x6d && arr[5] === 0x6f && arr[6] === 0x6f && arr[7] === 0x76) ||
        (arr[4] === 0x6d && arr[5] === 0x64 && arr[6] === 0x61 && arr[7] === 0x74)
      ) {
        return resolve(true);
      }

      // Default allow if undetermined in browser, backend will strictly enforce
      resolve(true);
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(slice);
  });
}
