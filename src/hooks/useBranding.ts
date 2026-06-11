import { useState, useEffect } from "react";

export interface Branding {
  schoolLogo: string | null;
  schoolLogoDark: string | null;
  schoolLogoLight: string | null;
  schoolFavicon: string | null;
  schoolAppIcon: string | null;
}

const DEFAULT: Branding = {
  schoolLogo: null,
  schoolLogoDark: null,
  schoolLogoLight: null,
  schoolFavicon: null,
  schoolAppIcon: null,
};

export function useBranding() {
  const [branding, setBranding] = useState<Branding>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const res = await fetch("/api/branding");
      if (res.ok) setBranding(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBranding(); }, []);

  const saveBranding = async (data: Branding): Promise<boolean> => {
    try {
      const res = await fetch("/api/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) { setBranding(data); return true; }
    } catch { }
    return false;
  };

  const getLogo = (theme: "light" | "dark"): string | null => {
    if (theme === "dark") return branding.schoolLogoDark || branding.schoolLogo;
    return branding.schoolLogoLight || branding.schoolLogo;
  };

  return { branding, loading, saveBranding, fetchBranding, getLogo };
}
