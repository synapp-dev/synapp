"use client";

import Image, { type ImageProps } from "next/image";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { cn } from "@workspace/ui/lib/utils";

export interface StorageImageProps extends Omit<ImageProps, "src"> {
  /** URL (external) or storage path (schools/images/...) */
  src: string | null | undefined;
  /** Optional class for loading/error placeholder */
  className?: string;
}

/**
 * Renders an image from either an external URL or a Supabase storage path.
 * For storage paths (schools/images/...), fetches a signed URL client-side.
 */
export function StorageImage({
  src,
  alt,
  className,
  sizes: sizesProp,
  ...rest
}: StorageImageProps) {
  const { url, loading, error } = useStorageImageUrl(src);

  if (!src) return null;
  if (error) {
    return (
      <div
        className={cn("bg-muted flex items-center justify-center", className)}
        style={
          rest.width && rest.height
            ? { width: rest.width, height: rest.height }
            : undefined
        }
      />
    );
  }
  if (loading) {
    return (
      <div
        className={cn("animate-pulse bg-muted", className)}
        style={
          rest.width && rest.height
            ? { width: rest.width, height: rest.height }
            : undefined
        }
      />
    );
  }
  if (!url) return null;

  // When using fill, provide a default sizes if not specified (improves performance)
  const sizes =
    sizesProp ??
    (rest.fill
      ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
      : undefined);

  return (
    <Image
      src={url}
      alt={alt}
      className={className}
      sizes={sizes}
      {...rest}
    />
  );
}
