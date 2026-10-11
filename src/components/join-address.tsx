"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale } from "./locale-provider";

function JoinQr({ url }: { url: string }) {
  const { t } = useLocale();
  const [result, setResult] = useState<{ url: string; image: string | null }>();
  useEffect(() => {
    let active = true;
    void import("qrcode")
      .then((qr) =>
        qr.toDataURL(url, { width: 216, margin: 4, errorCorrectionLevel: "M" }),
      )
      .then((image) => {
        if (active) setResult({ url, image });
      })
      .catch(() => {
        if (active) setResult({ url, image: null });
      });
    return () => {
      active = false;
    };
  }, [url]);
  const image = result?.url === url ? result.image : undefined;
  return image ? (
    <Image
      className="join-qr"
      src={image}
      width={216}
      height={216}
      unoptimized
      alt={t("Scan to open LinguaLocal")}
    />
  ) : image === null ? (
    <p className="inline-message" role="status">
      {t("QR code unavailable. Use the address above.")}
    </p>
  ) : (
    <div className="join-qr skeleton" aria-label={t("Loading")} role="status" />
  );
}

export function JoinAddress({ addresses }: { addresses: string[] }) {
  const { t } = useLocale();
  const [chosen, setChosen] = useState("");
  const address = addresses.includes(chosen) ? chosen : addresses[0];
  if (!address) return null;
  return (
    <div className="join-preview">
      {addresses.length > 1 && (
        <div className="form-field">
          <label htmlFor="join-address">{t("School address")}</label>
          <select
            id="join-address"
            dir="ltr"
            value={address}
            onChange={(event) => setChosen(event.target.value)}
          >
            {addresses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      )}
      <a
        className="network-address"
        href={address}
        target="_blank"
        rel="noreferrer"
        dir="ltr"
      >
        {address}
      </a>
      <JoinQr url={address} />
    </div>
  );
}
