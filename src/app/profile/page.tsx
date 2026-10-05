import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { CalendarCheck, CalendarDays, CalendarX, Clock, History, KeyRound, Mail, MapPin, MessageSquare, User } from "lucide-react";
import { auth } from "@/auth";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { findUserProfile } from "@/lib/auth/users";
import { getBookingsForUser, groupBookings, type Booking, type BookingStatus } from "@/lib/bookings";
import { getFeaturedPackages } from "@/lib/content";
import { formatDisplayDate } from "@/lib/date";
import type { TourPackage } from "@/types";

export const metadata: Metadata = {
  title: "My Profile",
  robots: { index: false, follow: false },
};

const statusBadge: Record<BookingStatus, { label: string; tone: "primary" | "accent" | "gold" | "nature" }> = {
  pending: { label: "Pending", tone: "gold" },
  confirmed: { label: "Confirmed", tone: "nature" },
  cancelled: { label: "Cancelled", tone: "accent" },
};

function formatDuration(pkg?: TourPackage) {
  if (!pkg) return null;
  if (pkg.durationLabel) return pkg.durationLabel;
  if (pkg.durationDays) return `${pkg.durationDays} day${pkg.durationDays > 1 ? "s" : ""}`;
  return null;
}

function BookingCard({ booking, pkg, isPast }: { booking: Booking; pkg?: TourPackage; isPast?: boolean }) {
  const badge =
    isPast && booking.status === "confirmed"
      ? { label: "Completed", tone: "primary" as const }
      : isPast && booking.status === "pending"
        ? { label: "Not confirmed", tone: "accent" as const }
        : statusBadge[booking.status];
  const duration = formatDuration(pkg);

  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-surface p-4 ring-1 ring-border sm:flex-row">
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl bg-midnight/5 sm:aspect-square sm:w-28">
        {pkg?.image?.url && (
          <Image src={pkg.image.url} alt={pkg.image.alt || booking.packageTitle} fill sizes="(min-width: 640px) 112px, 100vw" className="object-cover" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-semibold text-midnight">
            {pkg ? (
              <Link href={`/tour-packages/${booking.packageSlug}`} className="hover:text-primary hover:underline">
                {booking.packageTitle}
              </Link>
            ) : (
              booking.packageTitle
            )}
          </h3>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={15} />
            {booking.travelDate ? formatDisplayDate(booking.travelDate) : "Date to be confirmed"}
          </span>
          {duration && (
            <span className="flex items-center gap-1.5">
              <Clock size={15} />
              {duration}
            </span>
          )}
          {pkg?.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={15} />
              {pkg.location}
            </span>
          )}
        </div>
        {booking.adminMessage && (
          <div className="rounded-xl bg-primary/5 px-3 py-2.5 text-sm">
            <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
              <MessageSquare size={13} /> Message from our team
            </p>
            <p className="whitespace-pre-line text-midnight">{booking.adminMessage}</p>
          </div>
        )}
        <p className="text-xs text-slate/80">Requested {formatDisplayDate(booking.createdAt.slice(0, 10))}</p>
      </div>
    </article>
  );
}

function TourSection({
  id,
  icon: Icon,
  title,
  description,
  emptyText,
  bookings,
  packagesBySlug,
  isPast,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  emptyText: string;
  bookings: Booking[];
  packagesBySlug: Map<string, TourPackage>;
  isPast?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-28 rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border sm:p-8">
      <header className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon size={20} />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold text-midnight">
            {title} <span className="text-slate">({bookings.length})</span>
          </h2>
          <p className="text-sm text-slate">{description}</p>
        </div>
      </header>
      {bookings.length > 0 ? (
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} pkg={packagesBySlug.get(booking.packageSlug)} isPast={isPast} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-slate">{emptyText}</p>
      )}
    </section>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const [storedUser, bookings, packages] = await Promise.all([
    findUserProfile(session.user.id),
    getBookingsForUser(session.user.id),
    getFeaturedPackages(),
  ]);

  const user = {
    name: storedUser?.name ?? session.user.name ?? "Traveller",
    email: storedUser?.email ?? session.user.email ?? "",
    image: storedUser?.image ?? session.user.image ?? null,
    createdAt: storedUser?.createdAt.toISOString(),
    signInMethod: [
      storedUser?.hasPassword ? "Email & password" : null,
      storedUser?.providers.includes("google") ? "Google" : null,
    ]
      .filter(Boolean)
      .join(" + ") || "Email & password",
  };

  const { upcoming, pending, past, cancelled } = groupBookings(bookings);
  const packagesBySlug = new Map(packages.map((pkg) => [pkg.slug, pkg]));

  const details = [
    { icon: User, label: "Full name", value: user.name },
    { icon: Mail, label: "Email", value: user.email },
    { icon: KeyRound, label: "Sign-in method", value: user.signInMethod },
    { icon: CalendarDays, label: "Member since", value: user.createdAt ? formatDisplayDate(user.createdAt.slice(0, 10)) : "—" },
  ];

  const stats = [
    { href: "#upcoming", label: "Upcoming", count: upcoming.length },
    { href: "#pending", label: "Pending", count: pending.length },
    { href: "#past", label: "Past", count: past.length },
    { href: "#cancelled", label: "Cancelled", count: cancelled.length },
  ];

  return (
    <section className="bg-ivory py-12 lg:py-16">
      <Container className="grid grid-cols-1 gap-8 lg:grid-cols-[340px_1fr]">
        {/* User details */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border sm:p-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <UserAvatar name={user.name} image={user.image} size={96} />
              <div>
                <h1 className="font-display text-2xl font-semibold text-midnight">{user.name}</h1>
                <p className="text-sm text-slate">{user.email}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-2">
              {stats.map((stat) => (
                <a key={stat.label} href={stat.href} className="rounded-2xl bg-primary/5 px-2 py-3 text-center transition-colors hover:bg-primary/10">
                  <span className="block font-display text-2xl font-semibold text-primary">{stat.count}</span>
                  <span className="text-xs font-medium text-slate">{stat.label}</span>
                </a>
              ))}
            </div>

            <dl className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
              {details.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon size={18} className="mt-0.5 shrink-0 text-slate" />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold tracking-wide text-slate uppercase">{label}</dt>
                    <dd className="truncate text-sm font-medium text-midnight">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <Button href="/tour-packages" size="lg" className="w-full justify-center">
            Browse Tour Packages
          </Button>
        </aside>

        {/* Tours */}
        <div className="flex flex-col gap-6">
          <TourSection
            id="upcoming"
            icon={CalendarCheck}
            title="Upcoming Tours"
            description="Confirmed trips that are coming up."
            emptyText="No confirmed upcoming tours yet."
            bookings={upcoming}
            packagesBySlug={packagesBySlug}
          />
          <TourSection
            id="pending"
            icon={Clock}
            title="Pending Tours"
            description="Booking requests our team is reviewing. We reply within one business day."
            emptyText="No pending requests. Pick a package and tap “Check Availability” to request a booking."
            bookings={pending}
            packagesBySlug={packagesBySlug}
          />
          <TourSection
            id="past"
            icon={History}
            title="Past Tours"
            description="Completed trips and requests whose date has passed."
            emptyText="No past tours yet."
            bookings={past}
            packagesBySlug={packagesBySlug}
            isPast
          />
          {cancelled.length > 0 && (
            <TourSection
              id="cancelled"
              icon={CalendarX}
              title="Cancelled Bookings"
              description="Requests that were cancelled. Check the team's message for details."
              emptyText="No cancelled bookings."
              bookings={cancelled}
              packagesBySlug={packagesBySlug}
            />
          )}
        </div>
      </Container>
    </section>
  );
}
