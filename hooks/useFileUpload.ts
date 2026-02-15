// hooks/useFileUpload.ts
import { useState } from 'react';
import { supabase, isSupabaseInitialized } from '../services/supabase';
import imageCompression from 'browser-image-compression';

interface UploadProgress {
  percent: number;
  uploading: boolean;
}

interface UseFileUploadReturn {
  uploadFile: (file: File, userId: number) => Promise<string>;
  uploadProgress: UploadProgress;
  error: Error | null;
}

export const useFileUpload = (): UseFileUploadReturn => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    percent: 0,
    uploading: false
  });
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = async (file: File, userId: number): Promise<string> => {
    setError(null);
    setUploadProgress({ percent: 0, uploading: true });

    try {
      // If offline mode, create blob URL
      if (!isSupabaseInitialized || !supabase) {
        const blobUrl = URL.createObjectURL(file);
        setUploadProgress({ percent: 100, uploading: false });
        return blobUrl;
      }

      let fileToUpload = file;

      // Compress image if it's an image
      if (file.type.startsWith('image/')) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          onProgress: (percent: number) => {
            setUploadProgress({ percent: percent / 2, uploading: true }); // First 50% for compression
          }
        };

        fileToUpload = await imageCompression(file, options);
      }

      // Generate unique file path
      const timestamp = Date.now();
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${userId}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress({ percent: 100, uploading: false });

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      return publicUrl;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      setError(error);
      setUploadProgress({ percent: 0, uploading: false });
      throw error;
    }
  };

  return {
    uploadFile,
    uploadProgress,
    error
  };
};

// Utility function to delete file from storage
export const deleteFile = async (fileUrl: string): Promise<void> => {
  if (!supabase || !fileUrl.includes('supabase.co')) return;

  try {
    // Extract file path from public URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf('media') + 1).join('/');

    const { error } = await supabase.storage
      .from('media')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
    }
  } catch (err) {
    console.error('Error parsing file URL:', err);
  }
};

// Get file size before upload
export const getFileSize = (file: File): { size: number; formatted: string } => {
  const sizeInMB = file.size / (1024 * 1024);
  
  let formatted: string;
  if (sizeInMB < 1) {
    formatted = `${(file.size / 1024).toFixed(1)} KB`;
  } else if (sizeInMB < 1000) {
    formatted = `${sizeInMB.toFixed(1)} MB`;
  } else {
    formatted = `${(sizeInMB / 1024).toFixed(1)} GB`;
  }

  return {
    size: file.size,
    formatted
  };
};

// Validate file before upload
export const validateFile = (
  file: File, 
  maxSizeMB: number = 50,
  allowedTypes?: string[]
): { valid: boolean; error?: string } => {
  // Check size
  const { size } = getFileSize(file);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (size > maxSizeBytes) {
    return {
      valid: false,
      error: `Файл слишком большой. Максимальный размер: ${maxSizeMB} MB`
    };
  }

  // Check type if specified
  if (allowedTypes && allowedTypes.length > 0) {
    const fileType = file.type;
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.split('/')[0];
        return fileType.startsWith(baseType);
      }
      return fileType === type;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `Неподдерживаемый тип файла. Разрешены: ${allowedTypes.join(', ')}`
      };
    }
  }

  return { valid: true };
};
