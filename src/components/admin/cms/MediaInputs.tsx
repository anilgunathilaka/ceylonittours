"use client";

import { useRef, useState, type ClipboardEvent } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, MapPin, Trash2 } from "lucide-react";
import { uploadFile } from "@/components/admin/cms/upload";
import type { ContentType } from "@/lib/cms/config";
import type { ImageValue, LocationValue } from "@/lib/cms/form-values";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-midnight placeholder:text-slate/60 focus:border-secondary focus:outline-none";

/** Several photos with alt text and ordering, submitted as one JSON field. */
export function GalleryInput({
  name,
  folder,
  initial,
  max,
  fallbackAlt,
  onUploading,
}: {
  name: string;
  folder: ContentType;
  initial: ImageValue[];
  max: number;
  fallbackAlt: string;
  onUploading: (delta: number) => void;
}) {
  const [images, setImages] = useState(() => initial.map((image) => ({ key: crypto.randomUUID(), image })));
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);

  async function uploadAll(files: File[]) {
    setError(undefined);
    const room = max - images.length;
    if (files.length > room) setError(`Only ${room} more photo${room === 1 ? "" : "s"} can be added.`);
    for (const file of files.slice(0, Math.max(room, 0))) {
      setBusy((n) => n + 1);
      onUploading(1);
      try {
        const image = await uploadFile(file, folder);
        setImages((list) => [...list, { key: crypto.randomUUID(), image: { ...image, alt: fallbackAlt } }]);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Upload failed — please try again.");
      } finally {
        setBusy((n) => n - 1);
        onUploading(-1);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  const move = (index: number, delta: number) =>
    setImages((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });

  const setAlt = (key: string, alt: string) =>
    setImages((list) => list.map((item) => (item.key === key ? { ...item, image: { ...item.image, alt } } : item)));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4">
      <input type="hidden" name={name} value={JSON.stringify(images.map((entry) => entry.image))} />
      {images.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((entry, index) => (
            <li key={entry.key} className="flex flex-col gap-2 rounded-lg bg-ivory/60 p-2 ring-1 ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded URL */}
              <img src={entry.image.url} alt="" className="aspect-[3/2] w-full rounded-md object-cover" />
              <input
                value={entry.image.alt}
                placeholder="Alt text (describe the photo)"
                onChange={(event) => setAlt(entry.key, event.target.value)}
                className={cn(inputClass, "h-9")}
              />
              <div className="flex items-center gap-1">
                <span className="mr-auto text-xs font-semibold text-slate">#{index + 1}</span>
                <IconButton label="Move earlier" disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp size={14} />
                </IconButton>
                <IconButton label="Move later" disabled={index === images.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDown size={14} />
                </IconButton>
                <IconButton label="Remove photo" onClick={() => setImages((list) => list.filter((item) => item.key !== entry.key))}>
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label
          className={cn(
            "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark",
            images.length >= max && "pointer-events-none opacity-50",
          )}
        >
          {busy > 0 ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          {busy > 0 ? `Uploading ${busy}…` : "Add photos"}
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            disabled={images.length >= max}
            onChange={(event) => void uploadAll(Array.from(event.target.files ?? []))}
          />
        </label>
        <span className="text-xs text-slate">
          {images.length} / {max} photos · JPEG, PNG, WebP or AVIF, up to 8 MB each
        </span>
      </div>
      {error && <span className="text-xs font-medium text-accent-dark">{error}</span>}
    </div>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full p-1.5 text-slate hover:bg-midnight/5 hover:text-midnight disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Reads "7.2936, 80.6350" as copied from Google Maps */
export function parseCoordinates(text: string) {
  const match = text.match(/(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  return match ? { lat: match[1], lng: match[2] } : null;
}

/** OpenStreetMap embed centred on a point, with a marker */
export function mapEmbedUrl(lat: number, lng: number, span = 0.01) {
  const bbox = [lng - span, lat - span, lng + span, lat + span].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

/** Latitude/longitude inputs with a live map preview. */
export function LocationInput({ name, initial, invalid }: { name: string; initial: LocationValue; invalid: boolean }) {
  const [location, setLocation] = useState(initial);
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  const valid = location.lat !== "" && location.lng !== "" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  // Pasting "lat, lng" into either box fills both
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const coords = parseCoordinates(event.clipboardData.getData("text"));
    if (coords) {
      event.preventDefault();
      setLocation(coords);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          name={`${name}Lat`}
          inputMode="decimal"
          placeholder="Latitude, e.g. 7.2936"
          value={location.lat}
          onPaste={onPaste}
          onChange={(event) => setLocation((current) => ({ ...current, lat: event.target.value.trim() }))}
          className={cn(inputClass, "h-11", invalid && "border-accent")}
        />
        <input
          name={`${name}Lng`}
          inputMode="decimal"
          placeholder="Longitude, e.g. 80.6350"
          value={location.lng}
          onPaste={onPaste}
          onChange={(event) => setLocation((current) => ({ ...current, lng: event.target.value.trim() }))}
          className={cn(inputClass, "h-11", invalid && "border-accent")}
        />
      </div>
      {valid ? (
        <iframe title="Meeting point map" className="h-64 w-full rounded-xl ring-1 ring-border" loading="lazy" src={mapEmbedUrl(lat, lng)} />
      ) : (
        <div className="flex h-24 items-center justify-center gap-2 rounded-xl bg-ivory text-sm text-slate ring-1 ring-border">
          <MapPin size={16} /> Enter coordinates to preview the map
        </div>
      )}
    </div>
  );
}
