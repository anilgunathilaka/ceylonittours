import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { sectionTitleClass } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { getLatestBlogPosts } from "@/lib/content";
import { cn } from "@/lib/utils";

// Dates are stored as plain YYYY-MM-DD; format in UTC so they never shift a day
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

const rollText = "block transition-[translate,filter] duration-500 ease-out-luxury";

/** Pill link whose label rolls up on hover: the text blurs out upward as a copy rises in from below. */
function RollLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-medium text-midnight shadow-card transition-transform duration-300 ease-out-luxury hover:scale-95"
    >
      <span className="relative block h-5 overflow-hidden leading-5">
        <span className={cn(rollText, "group-hover:-translate-y-full group-hover:blur-[10px]")}>{children}</span>
        <span aria-hidden className={cn(rollText, "blur-[10px] group-hover:-translate-y-full group-hover:blur-none")}>
          {children}
        </span>
      </span>
    </Link>
  );
}

export async function LatestBlogs() {
  const blogPosts = await getLatestBlogPosts();

  return (
    <section className="bg-border/50 py-20 lg:py-28">
      <Container>
        <Reveal className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <h2 className={cn(sectionTitleClass, "max-w-xl text-midnight")}>Latest Travel Stories & Guides</h2>
          <RollLink href="/blog">See All Articles</RollLink>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-[72px] lg:grid-cols-3">
          {blogPosts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 0.1} className="h-full">
              <Link href="/blog" className="group flex h-full flex-col rounded-3xl bg-white p-1">
                <div className="flex flex-1 flex-col px-5 pt-5 pb-10">
                  <p className="text-xs tracking-[0.03em] text-slate/70 uppercase">
                    {dateFormat.format(new Date(post.publishedAt))}
                    <span className="mx-2" aria-hidden>
                      ·
                    </span>
                    {post.readTimeMinutes} min read
                  </p>
                  <h3 className="mt-4 font-display text-[1.35rem] leading-[1.556] font-semibold text-midnight transition-colors group-hover:text-primary">
                    {post.title}
                  </h3>
                  <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate">{post.excerpt}</p>
                  <span className="mt-4 self-start rounded-full bg-midnight/[0.06] px-3 py-1.5 text-sm text-midnight">
                    {post.category}
                  </span>
                </div>
                <div className="relative aspect-[453/298] overflow-hidden rounded-[20px]">
                  <Image
                    src={post.image.url}
                    alt={post.image.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out-luxury group-hover:scale-105"
                  />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
