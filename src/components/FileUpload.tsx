
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Image, Video, Music, Upload } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
  className?: string;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <Image className="h-6 w-6" />;
  if (fileType.startsWith('video/')) return <Video className="h-6 w-6" />;
  if (fileType.startsWith('audio/')) return <Music className="h-6 w-6" />;
  return <FileText className="h-6 w-6" />;
};

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  className = ""
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileUpload(acceptedFiles);
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.ogg'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md']
    }
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
        transition-colors duration-200 ease-in-out
        ${isDragActive 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }
        ${className}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <Upload className="h-8 w-8 text-gray-400" />
        {isDragActive ? (
          <p className="text-blue-500 font-medium">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Supports images, videos, audio, PDFs, and text files
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const FilePreview: React.FC<{ file: File; onRemove?: () => void }> = ({
  file,
  onRemove
}) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {getFileIcon(file.type)}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          ×
        </button>
      )}
    </div>
  );
};
