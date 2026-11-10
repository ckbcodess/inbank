"use client";

/**
 * Each signed-in person's profile picture, kept on this browser for the prototype (a real build stores it with the
 * customer record). Keyed by actor id, so switching demo personas never shows someone else's face. Pictures are shrunk
 * to a small square before they're kept, so storage stays light.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PhotoState {
  photos: Record<string, string>;
  setPhoto: (actorId: string, dataUrl: string) => void;
  removePhoto: (actorId: string) => void;
}

export const useProfilePhotos = create<PhotoState>()(
  persist(
    (set) => ({
      photos: {},
      setPhoto: (actorId, dataUrl) => set((s) => ({ photos: { ...s.photos, [actorId]: dataUrl } })),
      removePhoto: (actorId) =>
        set((s) => {
          const next = { ...s.photos };
          delete next[actorId];
          return { photos: next };
        }),
    }),
    { name: "nibs-profile-photos" },
  ),
);

export const useProfilePhoto = (actorId: string | undefined) => useProfilePhotos((s) => (actorId ? s.photos[actorId] : undefined));

/** Reads an image file, crops it to a centred square and returns it as a small JPEG data URL. */
export function shrinkPhoto(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas"));
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Not an image"));
    };
    img.src = url;
  });
}
