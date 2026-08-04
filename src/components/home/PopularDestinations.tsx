import { getDestinations } from "@/lib/content";
import { PopularDestinationsClient } from "@/components/home/PopularDestinationsClient";

export async function PopularDestinations() {
  const destinations = await getDestinations();
  return <PopularDestinationsClient destinations={destinations} />;
}
