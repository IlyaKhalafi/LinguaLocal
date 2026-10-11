import { test } from "node:test";
import assert from "node:assert/strict";
import { discoverAddresses } from "../../src/lib/network";
import { schoolUrl, isLoopbackHostname } from "../../src/lib/network-address";

test("network discovery prefers LAN addresses and excludes unusable interfaces", () => {
  const entry = (address: string, internal = false) => ({
    address,
    internal,
    family: "IPv4",
  });
  const interfaces = {
    lo: [entry("127.0.0.1", true)],
    eth0: [
      entry("10.0.0.10"),
      entry("192.168.1.20"),
      entry("192.168.1.20"),
      entry("169.254.1.2"),
    ],
    docker0: [entry("172.17.0.1")],
  };
  assert.deepEqual(discoverAddresses({ interfaces, port: "8080" }), [
    "http://192.168.1.20:8080",
    "http://10.0.0.10:8080",
  ]);
  assert.deepEqual(discoverAddresses({ interfaces, container: true }), []);
  assert.deepEqual(
    discoverAddresses({
      interfaces,
      container: true,
      publicUrl: "https://school.local/",
    }),
    ["https://school.local"],
  );
  assert.throws(() => discoverAddresses({ port: "70000" }), /invalid/);
});
test("school URLs support local hostnames and reject addresses students cannot use", () => {
  assert.equal(
    schoolUrl("http://school.local:3000"),
    "http://school.local:3000",
  );
  for (const value of [
    "http://localhost:3000",
    "http://127.0.0.2:3000",
    "file:///tmp/data",
    "http://school.local/books",
    "http://name:password@school.local",
  ])
    assert.throws(() => schoolUrl(value));
  assert.equal(isLoopbackHostname("localhost."), true);
  assert.equal(isLoopbackHostname("school.localhost"), true);
  assert.equal(isLoopbackHostname("[::ffff:7f00:1]"), true);
  assert.equal(isLoopbackHostname("127.example.com"), false);
});
