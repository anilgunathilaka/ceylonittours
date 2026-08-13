"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function BookAvailabilityButton({
  packageSlug,
  packageTitle,
}: {
  packageSlug: string;
  packageTitle: string;
}) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const bookingUrl = `/contact?package=${encodeURIComponent(packageSlug)}&title=${encodeURIComponent(packageTitle)}`;

  function handleClick() {
    if (status === "authenticated") {
      router.push(bookingUrl);
      return;
    }

    const returnTo = pathname || `/tour-packages/${packageSlug}`;
    router.push(`/login?callbackUrl=${encodeURIComponent(bookingUrl)}&from=${encodeURIComponent(returnTo)}`);
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="lg"
      className="mt-6 w-full justify-center"
      onClick={handleClick}
      disabled={status === "loading"}
    >
      {status === "loading" ? "Loading…" : "Check Availability"}
    </Button>
  );
}
