# Run LinguaLocal at your school

LinguaLocal runs on a school computer, mini PC, or Linux server connected to the local Wi-Fi router. A typical modem or router does not run the application itself. Students use the router to reach the computer hosting it.

## Standalone archives

After running `npm run build`, create a distribution with `npm run release:package -- releases/lingualocal.tar.gz`. The command needs the system `tar` program and a local filesystem that supports hard links. The destination must be a new file. Copy the completed archive to USB or network storage afterwards.

Extract the archive on a computer with the same operating system and CPU architecture. Use Node.js 22.13 or newer. On Linux or macOS, run `HOSTNAME=0.0.0.0 node server.js` from the extracted directory. Set `LINGUALOCAL_DATA_DIR` to an absolute, persistent school data directory before starting the service.

In Windows PowerShell, set `$env:HOSTNAME='0.0.0.0'` and run `node server.js`.

Archives include the standalone server, local assets, owner tools, guides, and original starter content. They exclude school data and root environment files. Native dependencies are built for the packaging computer, so use Docker when deploying across different platforms. Archive creation leaves the build and existing output files intact.

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

## Optional offline pages

Open **Offline use** in Settings and choose **Enable offline pages**. The browser saves Home and up to 30 distinct visited pages, including filter variations. Pages are separated by interface language. Saved pages include the scripts and bundled fonts needed for local study. Pages that have not been saved show a short reconnect screen.

[Service workers require HTTPS or localhost](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API). The ordinary learning hub remains available over HTTP on the school network. Installation depends on the browser. When **Install app** is available, it appears inside the same optional section. Other browsers offer installation through their own menus.

App updates wait until existing tabs close. Cached pages and app assets refresh for the new build when it is opened online. A new build never mixes old HTML with different JavaScript files. **Remove offline copies** clears saved pages and media on this device without clearing personal progress, notes or decks. Browser storage can be evicted by the device, so offline copies supplement the school’s original collection.
