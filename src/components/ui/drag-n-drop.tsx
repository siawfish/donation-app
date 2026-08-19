'use client'

import React, { useCallback, useMemo } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { ImagePlus, Star, X, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

interface FileWithPreview extends File {
  preview?: string;
  url?: string;
}

interface DragAndDropProps {
  files: FileWithPreview[];
  onChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  error?: string;
  onTouched?: () => void;
  disabled?: boolean;
}

/** Firebase Storage uploads are metered and phone cameras produce huge files. */
const MAX_BYTES = 8 * 1024 * 1024;

export default function DragAndDrop({
  files = [],
  onChange,
  maxFiles = 5,
  error,
  onTouched,
  disabled = false,
}: DragAndDropProps) {
  const remaining = Math.max(0, maxFiles - files.length);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (disabled) return;

      if (rejections.length > 0) {
        const tooBig = rejections.some((r) => r.errors.some((e) => e.code === 'file-too-large'));
        const tooMany = rejections.some((r) => r.errors.some((e) => e.code === 'too-many-files'));
        toast.error(
          tooBig ? 'Some photos are over 8 MB'
            : tooMany ? `You can add up to ${maxFiles} photos`
            : 'Some files could not be added',
          { description: tooBig ? 'Try a smaller photo, or one straight from your camera roll.' : undefined }
        );
      }

      if (accepted.length === 0) return;

      const next = accepted.slice(0, remaining).map((file) =>
        Object.assign(file, { preview: URL.createObjectURL(file) })
      );
      if (accepted.length > remaining) {
        toast.info(`Added ${remaining} of ${accepted.length} — ${maxFiles} photos max`);
      }
      onChange([...files, ...next]);
      onTouched?.();
    },
    [files, onChange, remaining, maxFiles, disabled, onTouched]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxSize: MAX_BYTES,
    maxFiles: remaining,
    disabled: disabled || remaining === 0,
    noClick: true,   // the dropzone wraps the whole grid; clicking a tile shouldn't reopen the picker
    noKeyboard: true,
  });

  const move = (from: number, to: number) => {
    if (disabled || to < 0 || to >= files.length) return;
    const next = [...files];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const remove = (index: number) => {
    if (disabled) return;
    const target = files[index];
    if (target?.preview) URL.revokeObjectURL(target.preview);
    onChange(files.filter((_, i) => i !== index));
    onTouched?.();
  };

  const slots = useMemo(
    () => Array.from({ length: maxFiles }, (_, i) => files[i] ?? null),
    [files, maxFiles]
  );

  return (
    <div className={disabled ? 'opacity-60 pointer-events-none' : ''}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-bold text-ink">Photos</p>
          <p className="text-xs text-gray-400">
            The first photo is the cover — it&apos;s what people see when browsing.
          </p>
        </div>
        <span
          className={`text-xs font-extrabold px-2.5 py-1 rounded-full flex-shrink-0 ${
            files.length === 0 ? 'bg-sand text-gray-500' : 'bg-lime text-forest'
          }`}
        >
          {files.length}/{maxFiles}
        </span>
      </div>

      <div
        {...getRootProps()}
        className={`rounded-3xl transition-colors ${
          isDragActive ? 'ring-2 ring-forest ring-offset-4 ring-offset-canvas' : ''
        }`}
      >
        <input {...getInputProps()} />

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {slots.map((file, index) => {
            if (!file) {
              const isNextSlot = index === files.length;
              return (
                <button
                  key={`empty-${index}`}
                  type="button"
                  onClick={isNextSlot ? open : undefined}
                  disabled={!isNextSlot}
                  aria-label={isNextSlot ? 'Add a photo' : 'Empty photo slot'}
                  className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                    isNextSlot
                      ? 'border-gray-300 hover:border-forest hover:bg-sand cursor-pointer text-gray-400 hover:text-forest'
                      : 'border-gray-200 text-gray-200 cursor-default'
                  }`}
                >
                  <ImagePlus className="w-5 h-5" />
                  {isNextSlot && (
                    <span className="text-[10px] font-bold">
                      {files.length === 0 ? 'Add cover' : 'Add'}
                    </span>
                  )}
                </button>
              );
            }

            const src = file.preview || file.url || '';
            const isCover = index === 0;

            return (
              <div
                key={`${file.name}-${index}`}
                className={`group relative aspect-square rounded-2xl overflow-hidden bg-sand ${
                  isCover ? 'ring-2 ring-forest' : 'border border-gray-200/70'
                }`}
              >
                {src && (
                  <Image
                    src={src}
                    alt={`Photo ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 33vw, 20vw"
                    className="object-cover"
                    unoptimized
                  />
                )}

                {isCover && (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 bg-forest text-lime text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                    <Star className="w-2.5 h-2.5 fill-lime" /> COVER
                  </span>
                )}

                {/* Remove — always reachable, not hover-only, so it works on touch */}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Reordering: arrows rather than drag — reliable on touch,
                    and keyboard-accessible for free. */}
                <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move photo ${index + 1} earlier`}
                    className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center disabled:opacity-0 hover:bg-black/80 transition-all"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={index === files.length - 1}
                    aria-label={`Move photo ${index + 1} later`}
                    className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center disabled:opacity-0 hover:bg-black/80 transition-all"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isDragActive && (
        <p className="text-xs font-semibold text-forest mt-2">Drop to add {remaining} more…</p>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-red-500 text-xs mt-2">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      <p className="text-[11px] text-gray-400 mt-2">
        JPG or PNG, up to 8 MB each. Photos from a few angles get picked up faster.
      </p>
    </div>
  )
}
