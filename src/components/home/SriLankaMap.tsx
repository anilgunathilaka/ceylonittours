import { getDestinations } from "@/lib/content";
import { SriLankaMapClient } from "@/components/home/SriLankaMapClient";

export async function SriLankaMap() {
  const destinations = await getDestinations();
  return <SriLankaMapClient destinations={destinations} />;
}
