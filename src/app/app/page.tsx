"use client";

import { useEffect } from "react";
import { t } from "@/lib/i18n";

export default function AppRedirect() {
  useEffect(() => { window.location.href = "/app/dashboard/"; }, []);
  return <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>;
}
