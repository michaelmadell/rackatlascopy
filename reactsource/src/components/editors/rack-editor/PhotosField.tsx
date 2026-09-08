import { useRef } from 'react';
import { Button, Label } from '@/patchdocs-ui';
import { TbX, TbUpload } from 'react-icons/tb';

/** A screenshot sequence showed a "Photos" section on both the Rack and
 *  Device settings panels — an "Upload photos" dropzone button, no
 *  thumbnails were ever visible in the captured frames (every example was
 *  empty). This local clone has no real file/object storage, so a photo is
 *  read client-side into a data URI and persisted straight into the
 *  device/rack's own `photos` JSON column rather than through an upload
 *  endpoint — unlike the user-avatar route's "accept and discard" stub,
 *  this one actually round-trips. */
export default function PhotosField({
  photos,
  onChange,
  readOnly
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  readOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const readAsDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    const added = await Promise.all([...files].map(readAsDataUrl));
    onChange([...photos, ...added]);
  };

  return (
    <div>
      <Label>Photos</Label>
      {photos.length > 0 && (
        <div className="mb-2 grid grid-cols-4 gap-1.5">
          {photos.map((src, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-sm border border-[#27272a]">
              <img src={src} alt="" className="h-full w-full object-cover" />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onChange(photos.filter((_, j) => j !== i))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <TbX className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!readOnly && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
            <TbUpload className="mr-1 size-3.5" /> Upload photos
          </Button>
        </>
      )}
    </div>
  );
}
