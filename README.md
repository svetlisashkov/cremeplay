<div align="center">

  <img src="assets/cremeplay.png" alt="Cremeplay Logo" width="140" />

  # Cremeplay

  Ultra-lightweight, debloated YouTube Music desktop client powered by Tauri v2 and Rust.

  [![Release](https://img.shields.io/github/v/release/asheohto/cremeplay?style=for-the-badge&logo=github&color=E4544B)](https://github.com/asheohto/cremeplay/releases/latest)
  [![License](https://img.shields.io/badge/License-MIT-2ecc71?style=for-the-badge)](LICENSE)
  [![Support on Ko-fi](https://img.shields.io/badge/Ko--fi-omoretti-FF5E5B?style=for-the-badge&logo=kofi&logoColor=white)](https://ko-fi.com/omoretti)

</div>

---

## Support

<a href='https://ko-fi.com/omoretti' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi5.png' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

If Cremeplay helps you enjoy music without Chromium overhead, you can support the project on [Ko-fi](https://ko-fi.com/omoretti).

---
## About



Most YouTube Music desktop players run on Electron or heavy web wrappers. They consume 400 MB to 800 MB+ of RAM, render unnecessary video decoders and Canvas layers when you just want audio, and accumulate memory leaks over extended playback sessions.

**Cremeplay** is an ultra-lightweight, high-performance desktop music player built with **Tauri v2** and **Rust**. It replaces the Chromium audio pipeline with a native Rust audio engine powered by `rodio` and Symphonia, routing raw audio directly to Windows WASAPI with a minimal private working set of ~60 MB RAM on tray and ~150 MB on open window.

It interfaces directly with YouTube Music's Innertube API via asynchronous Rust services, providing authentic music discovery, radio recommendations, and library management without Google Polymer overhead or background tracking bloat.

---
## Screenshot
<div align="center">
<img width="636" height="415" alt="image" src="https://github.com/user-attachments/assets/2bb34b37-802a-4cc1-a666-c67626e7e948" />
<img width="636" height="415" alt="image" src="https://github.com/user-attachments/assets/76e72bde-3df2-4146-92bb-06ca5cdb873a" />
<img width="420" height="415" alt="image" src="https://github.com/user-attachments/assets/185bd902-f50a-4ac0-b210-199386eb3785" />
</div>
---
## Performance Comparison

| Metric | Pear Desktop (Electron) | Webview Wrappers | **Cremeplay (Tauri v2 + Rust)** |
| :--- | :--- | :--- | :--- |
| **RAM (Tray Only / Background)** | ~400 MB – 500 MB | ~180 MB – 250 MB | **~60 MB** |
| **RAM (Open Window / Active UI)** | ~600 MB – 850 MB+ | ~250 MB – 400 MB | **~150 MB** |
| **Process Model** | 6–10 loose Electron processes | Loose Edge WebView processes | **100% Bundled in Windows Job Object under parent `Cremeplay`** |
| **Audio Output (Volume Mixer)** | Scattered / Electron | Unlabeled `msedgewebview2.exe` | **Native `Cremeplay` with App Icon (WASAPI)** |
| **Installation & Distribution** | Heavy 150 MB+ Electron installer | Loose unsigned folder / wrapper | **Fast Setup Program App Installer (< 15 MB) & Portable Executable** |
| **Audio Pipeline** | Chromium Web Audio + Video rendering | Chromium Web Audio + Video rendering | **Direct Audio Streaming + Native WASAPI** |
| **API & Tracking Bloat** | Heavy Google Polymer Web App + trackers | Heavy Google Polymer Web App + trackers | **Direct Rust Innertube JSON API (Zero tracking overhead)** |
| **Startup Speed** | ~3.5s – 5.0s | ~1.5s – 2.5s | **< 400ms** |
| **Binary Size** | ~150 MB – 200 MB+ | ~80 MB – 100 MB | **< 20 MB** |

---

## Features

- **Extreme Low Memory Profile**: Consumes only **~60 MB RAM on tray** and **~150 MB RAM with open window**, backed by proactive working set trimming.
- **Single-Process Hierarchy**: All WebView2 child and rendering processes are bundled into a Windows Job Object directly under the parent `Cremeplay` process — zero orphan processes left behind on exit.
- **Native Audio Output Identity**: Media streams are labeled as **Cremeplay** with the official app icon in Windows Volume Mixer and Audio Settings (instead of generic `msedgewebview2.exe`).
- **Fast Program App Installer & Portable Exe**: Available both as a fast single-click setup installer that registers Cremeplay as a native Windows Program App (Start Menu shortcut and AppUserModelID integration) and as a zero-install portable executable.
- **Native Rust Audio Engine**: Raw audio decoded via Symphonia and streamed straight to Windows WASAPI with zero video decoding overhead.
- **Authentic YouTube Music Algorithm**: Complete feed exploration including *Listen Again*, *Daily Discover*, *From the Community* user playlists, and *Similar To* artists. Song selections queue smart "Up Next" tracks following YouTube's live music algorithm.
- **OBS Tuna Integration**: Built-in broadcast server on `http://127.0.0.1:1608/` serving live track metadata and album art for streaming overlays and desktop lyrics tools like [LyricReme](https://github.com/asheohto/lyricreme).
- **Dynamic Album Art Theme**: Extracts vibrant dominant tones directly from the current album cover art to ambiently tint the interface in real time, alongside handcrafted dark themes.
- **Native SponsorBlock**: Automatically skips non-music intros, skits, chatter, and video outros before frames are rendered.
- **Discord Rich Presence**: Displays live song title, artist, album art, elapsed time, and duration directly to your Discord profile.
- **Playlist & Library Power**: Collage covers for custom playlists without artwork, track shuffling, link copying, search filtering, and Google account login support with secure persistent session cookies.
- **System Tray & Media Shortcuts**: Full Windows media keys support (Play/Pause, Next, Previous) and unobtrusive minimize-to-tray background playback.

---

## Getting Started

### 1. Download

Choose your preferred format from the [Releases](https://github.com/asheohto/cremeplay/releases) page:
- **Fast Setup Program App (`Cremeplay_x.x.x_x64-setup.exe`)**: Fast user-level installer (< 15 MB) that registers Cremeplay in Windows Start Menu, sets the AppUserModelID, and adds an uninstaller in Settings.
- **Standalone Portable (`cremeplay.exe`)**: Zero-install standalone binary that runs immediately out of the box.

### 2. (Optional) Connect OBS Tuna or LyricReme

Cremeplay automatically runs a lightweight Tuna server on `http://127.0.0.1:1608/`. Open [LyricReme](https://github.com/asheohto/lyricreme) or your OBS Tuna overlay to enjoy synchronized lyrics and live stream widgets with zero setup.

---

## Building from Source

Requires [Rust](https://rustup.rs/) 1.90+, [Node.js](https://nodejs.org/) 20+, and pnpm.

### Windows

Windows builds require Windows 10/11, the MSVC toolchain, and WebView2:

```powershell
# Clone the repository
git clone https://github.com/asheohto/cremeplay.git
cd cremeplay

# Install frontend dependencies
pnpm install

# Run live-reloading development build
pnpm dev

# Build standalone production bundle
pnpm build
```

The compiled release binary is output to:
`.\src-tauri\target\release\cremeplay.exe`

### Linux

Linux builds use WebKitGTK 4.1, GTK 3, Ayatana AppIndicator, and ALSA. On
Debian or Ubuntu, install the native build dependencies with:

```bash
sudo apt install build-essential curl file libasound2-dev \
  libayatana-appindicator3-dev librsvg2-dev libwebkit2gtk-4.1-dev
```

Then build the frontend and native application:

```bash
pnpm install --frozen-lockfile
pnpm build:frontend
cargo build --release --locked --manifest-path src-tauri/Cargo.toml
```

KDE Plasma 6 is supported on Wayland through WebKitGTK. Global shortcuts use
XWayland when `DISPLAY` is available and are disabled gracefully in pure
Wayland sessions. Native audio uses ALSA; install and enable `pipewire-alsa` on
PipeWire desktops. `pnpm build` produces both `.deb` and AppImage bundles.

#### EndeavourOS / Arch Linux

Install an already-built package with pacman:

```bash
sudo pacman -U ./cremeplay-git-*.pkg.tar.zst
```

To build and install directly from this repository, install the standard Arch
build tools and run `makepkg` as a regular user (never as root):

```bash
sudo pacman -S --needed base-devel git
git clone https://github.com/svetlisashkov/cremeplay.git
cd cremeplay
makepkg -si
```

The PKGBUILD installs the native executable, Freedesktop launcher, and hicolor
icons. `pipewire-alsa` is optional but recommended on a standard EndeavourOS
PipeWire desktop.

#### Portable AppImage

Download the x86_64 AppImage, make it executable, and run it without installing:

```bash
chmod +x ./Cremeplay_*_amd64.AppImage
./Cremeplay_*_amd64.AppImage
```

Build it locally with `pnpm tauri build --bundles appimage`. The output is
written to `src-tauri/target/release/bundle/appimage/`. The Linux packaging
workflow under `.github/workflows/` builds and validates both the Arch package
and AppImage and exposes them as downloadable workflow artifacts.

#### Linux playback diagnostics

The YouTube IFrame player and the optional native Rust stream path are separate.
Diagnostic lines beginning with `[Playback][Iframe]` include the YouTube error
code, player state, WebKit user agent, referrer/origin data, and WebKit media
capability probes. Production Linux builds keep the privileged application at
`tauri://localhost` and load only the YouTube player bridge from a random
`http://127.0.0.1` loopback port. The bridge has no Tauri IPC capability and
uses `strict-origin-when-cross-origin`, so YouTube receives the HTTP origin as
the embedder identity without receiving a local path. Lines beginning with
`[Playback][Native]` report direct stream extraction, decoding, or
ALSA/PipeWire output separately.

Capture both Cremeplay and GStreamer output while reproducing one failed track:

```bash
RUST_LOG=info GST_DEBUG=2 ./Cremeplay_*_amd64.AppImage 2>&1 | tee cremeplay-playback.log
```

For an installed Arch package, replace the AppImage path with `cremeplay`.
Record installed media components and verify the common YouTube audio decoders:

```bash
pacman -Q webkit2gtk-4.1 gst-plugins-base gst-plugins-good gst-libav pipewire-alsa \
  2>&1 | tee -a cremeplay-playback.log
gst-inspect-1.0 opusdec 2>&1 | tee -a cremeplay-playback.log
gst-inspect-1.0 avdec_aac 2>&1 | tee -a cremeplay-playback.log
```

YouTube IFrame error `5` points to the HTML5/WebKit media path, while `153`
means the embed request lacks an accepted referrer or equivalent client
identity. Errors `100`, `101`, and `150` are specific to video availability or
embedding. Do not include account cookies or other credentials when attaching
the diagnostic log to an issue.

To verify the Linux error 153 fix, start the newly built AppImage with the
logging command above, sign in normally, and play at least two tracks. Confirm
that the log contains all of the following:

- a `Linux YouTube player host configured` line for a `127.0.0.1` URL;
- `[Playback][Iframe] event=ready` with
  `page_origin=tauri://localhost`, a `player_host_origin=http://127.0.0.1:...`,
  and `referrer_policy=strict-origin-when-cross-origin`;
- `[Playback][Iframe] event=state:playing` for each selected video ID;
- no `[Playback][Iframe] ... error_code=153` line.

Also confirm that search, Google sign-in, playlists, play/pause, seeking and an
application restart still work. If error 153 remains, attach the complete log
and the WebKitGTK version; the bounded fallback logic stops platform-wide error
153 immediately instead of searching alternate uploads indefinitely.

---

## Integrations

| Integration | Details | Default Port / State |
| :--- | :--- | :--- |
| **OBS Tuna** | Real-time track metadata and cover art server for OBS and desktop widgets | `http://127.0.0.1:1608/` |
| **Discord RPC** | Shows current track, artist, album art, and live elapsed timer on Discord | Enabled |
| **SponsorBlock** | Skips non-music intros, interludes, and chatter automatically | Enabled |
| **Native Audio** | Low-latency output via WASAPI on Windows or ALSA/PipeWire on Linux | Enabled |

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Play / Pause |
| `Media Play / Pause` | Global system Play / Pause |
| `Media Next` | Skip to next track |
| `Media Previous` | Skip to previous track |
| `Esc` | Clear search / Close modal views |

---

## License

MIT - see [LICENSE](LICENSE).

---

## Support

- Issues: https://github.com/asheohto/cremeplay/issues
- Ko-fi: https://ko-fi.com/omoretti

---

## Tags

youtube music desktop, lightweight youtube music, youtube music tauri, rust music player, rodio audio, debloated youtube music, youtube music client, discord rich presence music, obs tuna youtube music, sponsorblock music, desktop music player, windows youtube music, low ram music player, lyricreme companion, tauri v2, wasapi audio
