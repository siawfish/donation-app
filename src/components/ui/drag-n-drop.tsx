'use client'

import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileIcon, UploadIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileWithPreview extends File {
  preview?: string;
}

interface DragAndDropProps {
  files: FileWithPreview[];
  onChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
}

export default function DragAndDrop({ files = [], onChange, maxFiles = 5 }: DragAndDropProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => 
      Object.assign(file, { preview: URL.createObjectURL(file) })
    );
    onChange([...files, ...newFiles].slice(0, maxFiles));
  }, [files, onChange, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': []
    },
    maxFiles: maxFiles - files.length,
  })

  const removeFile = (fileToRemove: FileWithPreview) => {
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
    <div className="h-full flex flex-col">
      <div
        {...getRootProps()}
        className={`flex flex-col justify-center items-center bg-gray-200 h-full rounded-sm p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />
        {files.length === 0 ? (
          <div className="space-y-4">
            <UploadIcon className="w-12 h-12 mx-auto text-gray-400" />
            <p className="text-lg font-cabinet">
              Drag & drop your images or videos here, or click to select
            </p>
            <p className="text-sm text-gray-500">Supports: Images and Videos (Max: {maxFiles} files)</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Drop more files or click to select (Max: {maxFiles} files)
          </p>
        )}
      </div>
      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          {files.map((file, index) => (
            <div key={index} className="flex items-center space-x-4 p-4 bg-gray-100 rounded-lg">
              {file.type.startsWith('image/') ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-20 h-20 object-cover rounded"
                />
              ) : file.type.startsWith('video/') ? (
                <video
                  src={file.preview}
                  className="w-20 h-20 object-cover rounded"
                />
              ) : (
                <FileIcon className="w-20 h-20 text-gray-400" />
              )}
              <div className="flex-grow">
                <p className="font-semibold truncate">{file.name}</p>
                <p className="text-sm text-gray-500">{file.type}</p>
                <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              <Button onClick={() => removeFile(file)} variant="outline" size="icon">
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