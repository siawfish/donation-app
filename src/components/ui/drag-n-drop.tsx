'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { ImagePlus, Star, X, ArrowLeft, ArrowRight, AlertCircle, FileImage } from 'lucide-react'
import { toast } from 'sonner'
import { AssetType } from '@/app/types'

/**
 * An item is either a File the user just picked, or an AssetType already in
 * Storage (edit mode). Both are kept in their original form all the way to
 * upload — an earlier version spread Files into plain objects to satisfy this
 * component's prop type, which silently destroyed them: File fields live on the
 * prototype, so `{...file}` yields `{}`.
 */
export type UploadItem = File | AssetType;

interface DragAndDropProps {
  files: UploadItem[];
  onChange: (files: UploadItem[]) => void;
  maxFiles?: number;
  error?: string;
  onTouched?: () => void;
  disabled?: boolean;
}

/** Firebase Storage is metered and phone cameras produce very large files. */
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Formats browsers can actually display. HEIC/HEIF are included because that is
 * what iPhones produce — iOS usually transcodes to JPEG on pick, but when it
 * doesn't we still accept the file and fall back to a placeholder tile rather
 * than rejecting the upload.
 */
const ACCEPTED: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg', '.jfif'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'image/avif': ['.avif'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
};

export function isUploadedAsset(item: UploadItem): item is AssetType {
  return typeof item === 'object' && item !== null && !(item instanceof File) && 'url' in item;
}

function keyFor(item: UploadItem, index: number) {
  return isUploadedAsset(item) ? item.id || `asset-${index}` : `${item.name}-${item.lastModified}-${index}`;
}

export default function DragAndDrop({
  files = [],
  onChange,
  maxFiles = 5,
  error,
  onTouched,
  disabled = false,
}: DragAndDropProps) {
  const remaining = Math.max(0, maxFiles - files.length);

  // Object URLs are cached per File and revoked on unmount, so re-renders don't
  // leak a new blob URL every time.
  const urlsRef = useRef(new Map<File, string>());
  const [unpreviewable, setUnpreviewable] = useState<Set<string>>(new Set());

  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const srcFor = (item: UploadItem): string => {
    if (isUploadedAsset(item)) return item.url;
    const cached = urlsRef.current.get(item);
    if (cached) return cached;
    const url = URL.createObjectURL(item);
    urlsRef.current.set(item, url);
    return url;
  };

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (disabled) return;

      if (rejections.length > 0) {
        const codes = rejections.flatMap((r) => r.errors.map((e) => e.code));
        if (codes.includes('file-too-large')) {
          toast.error('Some photos are over 8 MB', {
            description: 'Try a smaller version, or one straight from your camera roll.',
          });
        } else if (codes.includes('file-invalid-type')) {
          toast.error('That file type isn’t supported', {
            description: 'Use JPG, PNG, WebP, GIF, AVIF or HEIC.',
          });
        } else if (codes.includes('too-many-files')) {
          toast.error(`You can add up to ${maxFiles} photos`);
        } else {
          toast.error('Some files could not be added');
        }
      }

      if (accepted.length === 0) return;

      const next = accepted.slice(0, remaining);
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
    accept: ACCEPTED,
    maxSize: MAX_BYTES,
    maxFiles: remaining,
    disabled: disabled || remaining === 0,
    noClick: true,   // the dropzone wraps the grid; clicking a tile shouldn't reopen the picker
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
    if (target instanceof File) {
      const url = urlsRef.current.get(target);
      if (url) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(target);
      }
    }
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
        className={`rounded-3xl transition-shadow ${
          isDragActive ? 'ring-2 ring-forest ring-offset-4 ring-offset-canvas' : ''
        }`}
      >
        <input {...getInputProps()} />

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {slots.map((item, index) => {
            if (!item) {
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

            const key = keyFor(item, index);
            const isCover = index === 0;
            const label = isUploadedAsset(item) ? `Photo ${index + 1}` : item.name;
            const broken = unpreviewable.has(key);

            return (
              <div
                key={key}
                className={`group relative aspect-square rounded-2xl overflow-hidden bg-sand ${
                  isCover ? 'ring-2 ring-forest' : 'border border-gray-200/70'
                }`}
              >
                {broken ? (
                  // HEIC and friends can't be rendered by every browser; the file
                  // still uploads fine, so show a placeholder rather than a gap.
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
                    <FileImage className="w-5 h-5 text-gray-400" />
                    <span className="text-[9px] text-gray-400 leading-tight break-all line-clamp-2">{label}</span>
                  </div>
                ) : (
                  // Plain <img>: blob: and Storage URLs don't benefit from the
                  // Next image pipeline, and this gives us a reliable onError.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={srcFor(item)}
                    alt={label}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() => setUnpreviewable((prev) => new Set(prev).add(key))}
                  />
                )}

                {isCover && (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 bg-forest text-lime text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                    <Star className="w-2.5 h-2.5 fill-lime" /> COVER
                  </span>
                )}

                {/* Always visible, not hover-gated — hover doesn't exist on touch */}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Arrows rather than drag: reliable on touch, keyboard-accessible */}
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

      {isDragActive && remaining > 0 && (
        <p className="text-xs font-semibold text-forest mt-2">Drop to add {remaining} more…</p>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-red-500 text-xs mt-2">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      <p className="text-[11px] text-gray-400 mt-2">
        JPG, PNG, WebP, GIF, AVIF or HEIC — up to 8 MB each. Photos from a few angles get picked up faster.
      </p>
    </div>
  )
}
