import { Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";

interface DirectionsButtonProps extends Omit<ButtonProps, "onClick" | "asChild"> {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  storeName?: string | null;
  label?: string;
  testId?: string;
}

/**
 * "Chỉ đường" button.
 *
 * Uses Google Maps' universal directions URL:
 *   https://www.google.com/maps/dir/?api=1&destination=...
 *
 * On Android/iOS this URL is automatically intercepted by the Google Maps app
 * (and the system maps picker), so users get the native maps app for
 * navigation. On desktop browsers it opens Google Maps in a new tab. We do not
 * UA-sniff: the universal URL handles both cases.
 *
 * Prefers lat,lng when available; otherwise falls back to the textual address
 * (with the store name appended for disambiguation when present).
 */
export function DirectionsButton({
  latitude,
  longitude,
  address,
  storeName,
  label = "Chỉ đường",
  testId,
  variant = "outline",
  size = "sm",
  className,
  ...rest
}: DirectionsButtonProps) {
  const hasGeo =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const trimmedAddress = (address ?? "").trim();
  if (!hasGeo && !trimmedAddress) return null;

  const destination = hasGeo
    ? `${latitude},${longitude}`
    : storeName
      ? `${storeName}, ${trimmedAddress}`
      : trimmedAddress;
  const href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

  return (
    <Button asChild variant={variant} size={size} className={className} {...rest}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
      >
        <Navigation className="w-4 h-4 mr-2" />
        {label}
      </a>
    </Button>
  );
}
