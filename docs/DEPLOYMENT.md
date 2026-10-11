# Run LinguaLocal at your school

LinguaLocal runs on a school computer, mini PC, or Linux server connected to the local Wi-Fi router. A typical modem or router does not run the application itself. Students use the router to reach the computer hosting it.

## Docker deployment

```sh
docker compose up --build -d
docker compose logs -f
```

The service listens at port 3000. Find the host computer’s LAN address in its network settings, then open `http://HOST-LAN-IP:3000` from a student device on the same network. A DHCP reservation in the router keeps that address stable.

The named `school-data` volume stores settings, content, and copied media. Rebuilding the container preserves that volume. The image includes the starter collection and bundled media.

To stop the service while keeping its data, run `docker compose down`. Do not add `-v` unless you intend to delete the data volume.

## Node.js deployment

Install Node.js 22.13 or newer and run the commands from the project directory.

```sh
npm ci
npm run build
npm start
```

The build prepares a standalone server and copies its static assets and sample media. The startup script resolves data paths before launching the server. Re-run the build after source updates.

Optional configuration can be placed in `.env` using `.env.example` as a starting point.

| Variable                | Default        | Purpose                            |
| ----------------------- | -------------- | ---------------------------------- |
| `LINGUALOCAL_DATA_DIR`  | `./data`       | Shared content and school settings |
| `LINGUALOCAL_MEDIA_DIR` | `./data/media` | Manually copied media              |
| `LINGUALOCAL_HOST`      | `0.0.0.0`      | Host interface for `npm start`     |
| `PORT`                  | `3000`         | Default production port            |

Use absolute data paths when a process manager starts the app. The server must be able to read those directories. The content installer also needs write access. `npm start -- --port 8080` overrides `PORT`.

For systemd, adapt this service file to your checkout path and Node binary.

```ini
[Unit]
Description=LinguaLocal learning hub
After=network.target

[Service]
Type=simple
User=lingualocal
WorkingDirectory=/opt/lingualocal
Environment=NODE_ENV=production
Environment=LINGUALOCAL_DATA_DIR=/var/lib/lingualocal
Environment=LINGUALOCAL_MEDIA_DIR=/var/lib/lingualocal/media
ExecStart=/usr/bin/node /opt/lingualocal/scripts/start.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create the service account and data directories before starting the service. The standalone build must already exist in the checkout.

## Backups

The server data directory contains `settings.json`, `content.json`, and the `media` directory. Back up all three together. Copy the content file to share a portable content pack. Student progress lives in each browser and has separate export and restore actions.

Stop the service before copying a complete server backup to keep a consistent copy.

## Troubleshooting

| Problem                                   | What to check                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Students cannot open the hub              | Same Wi-Fi network, correct LAN IP and port, host firewall, and router client isolation |
| Media does not play                       | Matching file path, supported format, readable file, and browser codec support          |
| Changes do not save                       | Writable data directory, available disk space, and server logs                          |
| A content file is invalid                 | Validate and install a backup on the server. The original file remains until replaced   |
| Saved words disappear on another computer | Progress belongs to the browser. Export and restore it to move devices                  |
| Pronunciation is unavailable              | Install a local English speech voice. The dictionary remains usable                     |
| A media file is large                     | Copy the file into the configured media directory and reference it in the content pack  |

Run one server process against a data directory. Manage content through the server’s files.

## Joining the school network

The network helper uses the current network address when opened from a student device. On a Node.js host, it discovers local IPv4 addresses when the page is opened through localhost.

A Docker container cannot discover the host computer’s Wi-Fi address. Set `LINGUALOCAL_PUBLIC_URL=http://192.168.1.20:3000` in `.env` before running Docker Compose, replacing the example with the server’s actual address. A local hostname or HTTPS address also works. This setting can also override address discovery for Node.js deployment.

When using a reverse proxy or remapped port, set `LINGUALOCAL_PUBLIC_URL` to the address that students use.

Use the network button in Settings to show a join QR code. If the server has multiple network connections, choose the school’s address before sharing it. QR images are generated on the device without a cloud service.
