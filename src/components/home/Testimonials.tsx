import { getTestimonials } from "@/lib/content";
import { TestimonialsClient } from "@/components/home/TestimonialsClient";

export async function Testimonials() {
  const testimonials = await getTestimonials();
  return <TestimonialsClient testimonials={testimonials} />;
}
