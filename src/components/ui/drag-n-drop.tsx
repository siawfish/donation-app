'use client'

import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileIcon, UploadIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface FileWithPreview extends File {
  preview?: string;
}

interface DragAndDropProps {
  files: FileWithPreview[];
  onChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  error?: string;
  onTouched?: () => void;
  disabled?: boolean;
}

export default function DragAndDrop({ files = [], onChange, maxFiles = 5, error, onTouched, disabled = false }: DragAndDropProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled) return;
    const newFiles = acceptedFiles.map(file => 
      Object.assign(file, { preview: URL.createObjectURL(file) })
    );
    onChange([...files, ...newFiles].slice(0, maxFiles));
  }, [files, onChange, maxFiles, disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': []
    },
    maxFiles: maxFiles - files.length,
    disabled: disabled
  })

  const removeFile = (fileToRemove: FileWithPreview) => {
    if (disabled) return;
    const updatedFiles = files.filter(file => file !== fileToRemove);
    onChange(updatedFiles);
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`h-full flex flex-col ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={disabled ? undefined : onTouched}>
      <div
        {...getRootProps()}
        className={`flex flex-col justify-center items-center bg-gray-200 h-full rounded-sm p-8 text-center transition-colors ${
          disabled ? 'cursor-not-allowed' :
          isDragActive ? 'border-primary bg-primary-foreground border-2 border-dashed cursor-pointer' : 
          error ? 'border-red-500 border-2 border-dashed bg-red-500/10 cursor-pointer' : 
          'border-gray-300 hover:border-primary border-dashed border-2 cursor-pointer'
        }`}
      >
        <input {...getInputProps()} disabled={disabled} />
        {files.length === 0 ? (
          <div className="space-y-4">
            <UploadIcon className="w-12 h-12 mx-auto text-gray-400" />
            <p className="text-lg font-cabinet">
              {disabled ? "File upload is disabled" : "Drag & drop your images or videos here, or click to select"}
            </p>
            {!disabled && <p className="text-sm text-gray-500">Supports: Images and Videos (Max: {maxFiles} files)</p>}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {disabled ? "File upload is disabled" : `Drop more files or click to select (Max: ${maxFiles} files)`}
          </p>
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {files.length > 0 && (
        <div className="space-y-4 mt-4">
          {files.map((file, index) => (
            <div key={index} className="flex items-center space-x-2 bg-gray-100 rounded-lg">
              {file.type.startsWith('image/') ? (
                <Image
                  src={file.preview || ''}
                  alt={file.name}
                  width={60}
                  height={60}
                  className="object-cover rounded"
                  unoptimized
                />
              ) : file.type.startsWith('video/') ? (
                <video
                  src={file.preview || ''}
                  className="w-[60px] h-[60px] object-cover rounded"
                />
              ) : (
                <FileIcon className="w-[60px] h-[60px] text-gray-400" />
              )}
              <div className="flex-grow">
                <p className="font-semibold truncate text-sm">{file.name}</p>
                <p className="text-sm text-gray-500 text-xs">{file.type}</p>
                {file.size > 0 && (
                  <p className="text-sm text-gray-500 text-xs">{formatFileSize(file.size)}</p>
                )}
              </div>
              <Button 
                className="min-w-4" 
                onClick={() => removeFile(file)} 
                variant="outline" 
                size="icon"
                disabled={disabled}
                type="button"
              >
                <XIcon className="w-4 h-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}