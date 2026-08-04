import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { getLatestBlogPosts } from "@/lib/content";

export async function LatestBlogs() {
  const blogPosts = await getLatestBlogPosts();

  return (
    <section className="bg-surface py-20 lg:py-28">
      <Container>
        <div className="relative">
          <SectionHeading eyebrow="From The Journal" title="Latest Travel Stories & Guides" />
          <Link
            href="/blog"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark sm:absolute sm:top-0 sm:right-0 sm:mt-0"
          >
            See All Articles
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 0.1}>
              <Link href="/blog" className="block h-full">
                <Card className="flex h-full flex-col">
                  <div className="relative h-48 w-full overflow-hidden">
                    <Image
                      src={post.image.url}
                      alt={post.image.alt}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 ease-out-luxury group-hover:scale-105"
                    />
                    <Badge tone="white" className="absolute top-4 left-4">
                      {post.category}
                    </Badge>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate">
                      <Clock size={13} />
                      {post.readTimeMinutes} min read
                    </span>
                    <h3 className="font-display text-lg font-semibold text-midnight">{post.title}</h3>
                    <p className="line-clamp-2 text-sm text-slate">{post.excerpt}</p>
                    <span className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-semibold text-primary">
                      Read More
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex justify-center sm:hidden">
          <Link href="/blog" className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            See All Articles
            <ArrowRight size={16} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
