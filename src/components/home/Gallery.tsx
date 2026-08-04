import { getGalleryImages } from "@/lib/content";
import { GalleryClient } from "@/components/home/GalleryClient";

export async function Gallery() {
  const images = await getGalleryImages();
  return <GalleryClient images={images} />;
}
