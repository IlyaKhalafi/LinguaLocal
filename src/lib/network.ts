import { networkInterfaces } from "node:os";
import { isIP } from "node:net";
import { schoolUrl } from "./network-address";

type Interfaces = Record<
  string,
  | readonly { address: string; internal: boolean; family: string | number }[]
  | undefined
>;
export function discoverAddresses({
  port = "3000",
  protocol = "http:",
  interfaces,
  publicUrl = "",
  container = false,
}: {
  port?: string;
  protocol?: string;
  interfaces?: Interfaces;
  publicUrl?: string;
  container?: boolean;
} = {}) {
  if (publicUrl) return [schoolUrl(publicUrl)];
  if (container) return [];
  if (
    !["http:", "https:"].includes(protocol) ||
    (port &&
      (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535))
  )
    throw new Error("Network protocol or port is invalid.");
  const addresses = Object.entries(interfaces ?? networkInterfaces())
    .filter(
      ([name]) =>
        !/(?:^(?:lo$|docker|br-|veth|virbr|vboxnet|vmnet|tun|utun|wg|tailscale|bridge\d|awdl|llw)|vmware|virtualbox|vethernet)/i.test(
          name,
        ),
    )
    .flatMap(([, entries]) => entries ?? [])
    .filter(
      (entry) =>
        !entry.internal &&
        isIP(entry.address) === 4 &&
        !entry.address.startsWith("169.254."),
    )
    .map((entry) => entry.address);
  const rank = (address: string) =>
    address.startsWith("192.168.") ? 0 : address.startsWith("10.") ? 1 : 2;
  return [...new Set(addresses)]
    .sort(
      (a, b) =>
        rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true }),
    )
    .slice(0, 8)
    .map(
      (address) =>
        new URL(`${protocol}//${address}${port ? `:${port}` : ""}`).origin,
    );
}
