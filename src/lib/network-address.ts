export function isLoopbackHostname(host: string) {
  const value = host.toLowerCase().replace(/\.$/, "");
  return (
    ["localhost", "0.0.0.0", "[::1]", "[::]"].includes(value) ||
    value.endsWith(".localhost") ||
    /^127(?:\.\d+){3}$/.test(value) ||
    /^\[::ffff:7f[\da-f]{2}:[\da-f]{1,4}\]$/.test(value)
  );
}

export function schoolUrl(input: string) {
  const url = new URL(input);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    isLoopbackHostname(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "School address must be an HTTP or HTTPS network URL without a path.",
    );
  return url.origin;
}
