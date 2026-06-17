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
      const token = typeof window !== "undefined" ? (localStorage.getItem("smkn1_adm_token") || "") : "";
      const res = await fetch("/api/branding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data),
      });
      if (res.ok) { setBranding(data); return true; }
      console.error("saveBranding failed:", res.status, await res.text());
    } catch (e) {
      console.error("saveBranding error:", e);
    }
    return false;
  };

  const getLogo = (theme: "light" | "dark"): string | null => {
    if (theme === "dark") return branding.schoolLogoDark || branding.schoolLogo;
    return branding.schoolLogoLight || branding.schoolLogo;
  };

  return { branding, loading, saveBranding, fetchBranding, getLogo };
}
