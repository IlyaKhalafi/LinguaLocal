"use client";
import { useState } from "react";
import { Wifi } from "lucide-react";
import { useLocale } from "./locale-provider";
import { isLoopbackHostname, schoolUrl } from "@/lib/network-address";
import { JoinAddress } from "./join-address";

export function NetworkJoin() {
  const { t } = useLocale();
  const [addresses, setAddresses] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function showAddress() {
    setMessage("");
    setAddresses([]);
    if (!isLoopbackHostname(window.location.hostname)) {
      setAddresses([window.location.origin]);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/network", { cache: "no-store" });
      const result = (await response.json()) as {
        addresses?: unknown;
        code?: unknown;
      };
      if (!response.ok) {
        setMessage(
          result.code === "configuration"
            ? "Ask the school to check its network address."
            : "Unable to find the school address.",
        );
        return;
      }
      if (
        !Array.isArray(result.addresses) ||
        !result.addresses.every(
          (address: unknown) => typeof address === "string",
        )
      )
        throw new Error("Invalid network addresses");
      setAddresses(
        result.addresses.map((address: string) => schoolUrl(address)),
      );
      if (!result.addresses.length)
        setMessage("Set the school address on the server.");
    } catch {
      setMessage("Unable to find the school address.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="panel settings-panel"
      aria-labelledby="school-network-heading"
    >
      <h2 id="school-network-heading">{t("School network")}</h2>
      <button
        className="button secondary"
        style={{ marginTop: 20 }}
        onClick={addresses.length ? () => setAddresses([]) : showAddress}
        aria-expanded={addresses.length > 0}
        aria-controls="school-network-address"
        disabled={busy}
      >
        <Wifi size={14} />
        {t(
          busy
            ? "Loading"
            : addresses.length
              ? "Hide network address"
              : "Show network address",
        )}
      </button>
      <div id="school-network-address" hidden={!addresses.length}>
        {addresses.length > 0 && <JoinAddress addresses={addresses} />}
      </div>
      <p className={message ? "inline-message" : "sr-only"} role="status">
        {t(message)}
      </p>
    </section>
  );
}
