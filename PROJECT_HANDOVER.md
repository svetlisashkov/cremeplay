# Cremeplay Linux Port — Technical Handover

**Handover date:** 2026-10-14

**Repository:** <https://github.com/svetlisashkov/cremeplay>

**Development branch:** `feature/linux-support`

**Last implementation commit reviewed:** [`8826832e533ad0cd19445e655e4c3922a3f6ec35`](https://github.com/svetlisashkov/cremeplay/commit/8826832e533ad0cd19445e655e4c3922a3f6ec35)

This document closes active work on the Cremeplay Linux port. It records what
was demonstrated on real hardware, what the code does, and what remains
unverified or incomplete. It is not a claim that every Linux distribution,
account, track, or Windows regression path has been tested.

## 1. Final status

At the start of this handover, local `feature/linux-support` was clean and both
local `HEAD` and `origin/feature/linux-support` pointed to `8826832e533ad0cd19445e655e4c3922a3f6ec35`.
No implementation changes were made as part of the handover.

### Experimentally confirmed

The following results come from real-world testing on EndeavourOS, KDE Plasma
6, Wayland, PipeWire, and WebKitGTK 2.54.1:

- the Linux AppImage starts and the existing UI is usable;
- Google authentication and the YouTube Music catalog worked in the Linux test
  cycle;
- the production player host used an ephemeral loopback origin, observed as
  `http://127.0.0.1:35309` in one run;
- the YouTube iframe reported `ready`, `buffering`, `playing`, and `paused`;
- music was audible;
- the player reported `strict-origin-when-cross-origin` and YouTube error 153
  did not recur in the successful run;
- before the HTTP player bridge was added, every iframe playback attempt failed
  with error 153 while the page origin was `tauri://localhost`;
- the independent Rust Innertube stream-extraction request previously failed
  with HTTP 400.

The port therefore has a demonstrated working Linux playback path: the YouTube
IFrame API hosted by the loopback HTTP bridge. The direct Rust audio path is
not the path that produced the confirmed successful playback.

### Verified in project/CI-oriented validation

Before this handover, the Linux work had passed frontend compilation, Rust
`cargo check`/tests, and a native x86_64 AppImage build in the development
environment at the implementation baseline. The repository contains CI jobs
that build and inspect x86_64 AppImage and Arch package artifacts. No expensive
build or test was repeated solely for this documentation commit.

### Not established by the available evidence

- Native Rust stream extraction is not working in the reported Linux test; its
  HTTP 400 root cause was not resolved.
- Windows behavior after the bridge commit was preserved by conditional code,
  but was not runtime-regression-tested during this Linux handover.
- The bridge has not been penetration-tested, and its exact memory overhead was
  not measured. It runs in-process and does not create a second application or
  daemon.
- A fresh Arch `.pkg.tar.zst` was not built during this handover. The workflow
  is configured to do so, but workflow configuration is not itself proof of a
  successful artifact.
- Playback was not exhaustively tested across regions, account types, age
  restrictions, private uploads, or every codec and WebKitGTK version.

## 2. Linux playback architecture

There are two independent playback paths:

1. **Confirmed production Linux path — hosted YouTube iframe.** The privileged
   Tauri page remains at `tauri://localhost`. It embeds a small page served from
   an ephemeral `http://127.0.0.1:<port>` origin. That page owns the YouTube
   IFrame API instance and passes a restricted set of player commands and state
   messages to the main UI.
2. **Unreliable native path — Rust extraction and decoding.** The frontend also
   invokes Rust `play_track`. Rust requests an audio URL from an Innertube
   player endpoint, downloads the complete response into memory, decodes it
   through rodio/Symphonia, and opens the default WASAPI or ALSA device. The
   reported Linux extraction request failed with HTTP 400 before decoding or
   output.

The successful flow is:

```text
Tauri UI (tauri://localhost)
  -> validated postMessage commands
Loopback player host (http://127.0.0.1:<ephemeral>/youtube-player.html)
  -> YouTube IFrame API with HTTP Referer/origin
YouTube iframe (https://www.youtube.com)
  -> validated state/error messages
Loopback host -> Tauri UI -> Rust diagnostic command
```

When `play()` is called in the frontend, it currently starts the iframe path
and also invokes `play_track`. These are not a primary/fallback state machine;
they are concurrent independent attempts. In the confirmed Linux run the Rust
attempt failed, so there was no duplicate audio. If native extraction starts
working in the future, both paths can play simultaneously unless ownership is
redesigned.

### Exact playback files and functions

| File | Relevant implementation |
| --- | --- |
| [`frontend/src/main.ts`](frontend/src/main.ts) | `initYTPlayer()` asks Rust for the production host URL; `validatedYoutubeHostUrl()` restricts it to exact loopback HTTP shape; `initHostedYTPlayer()` creates the bridge iframe; `HostedYTPlayer` sends player-only commands; `isValidYoutubeHostMessage()` and the message listener validate returned data; `handleYTReady()`, `handleYTStateChange()`, and `handleYTError()` update state and diagnostics; `reportPlaybackDiagnostic()` forwards redacted diagnostics; `handlePlaybackError()` bounds fallback behavior; `play()` starts the iframe and invokes Rust `play_track`. `initDirectYTPlayer()` remains the non-hosted path used on Windows and in development builds. |
| [`frontend/public/youtube-player.html`](frontend/public/youtube-player.html) | Minimal player document with `strict-origin-when-cross-origin`; it contains no application UI or credentials. |
| [`frontend/public/youtube-player.js`](frontend/public/youtube-player.js) | Creates `YT.Player`, sets `origin` to the loopback page origin, applies iframe permissions/referrer policy, validates video IDs and quality values, translates commands, and emits `ready`, state, status, error, autoplay-blocked, and bridge-error messages. |
| [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs) | `pick_youtube_player_port()` selects a loopback port. `run()` registers `tauri-plugin-localhost` only for non-dev Linux, sets HTTP security headers, stores `YoutubePlayerHost`, restores cookies, creates the audio services, and registers commands. |
| [`src-tauri/src/commands.rs`](src-tauri/src/commands.rs) | `get_youtube_player_url()` returns the selected URL to the privileged main page; `log_playback_diagnostic()` writes sanitized iframe diagnostics; `play_track()` explicitly logs native extraction versus native decode/output failures. |
| [`src-tauri/src/innertube.rs`](src-tauri/src/innertube.rs) | `InnertubeClient::get_audio_stream_url()` performs the direct player request and selects an audio format URL when present. This is the path that returned HTTP 400 in the reported test. |
| [`src-tauri/src/audio_player.rs`](src-tauri/src/audio_player.rs) | `AudioPlayer::play_stream()` downloads the complete stream, decodes it, lazily opens the default output sink, and uses ALSA (normally PipeWire's ALSA compatibility layer) on Linux. |

Relevant Rust dependencies in [`src-tauri/Cargo.toml`](src-tauri/Cargo.toml)
are Tauri 2, Linux-only `tauri-plugin-localhost` 2.4.0, `reqwest` 0.13.5,
`rodio` 0.22.2, `tokio` 1.53.2, and `sha1` 0.11.0. Runtime integration on
Linux also depends on WebKitGTK 4.1 and its GStreamer media stack. PipeWire is
reached by the native player through ALSA compatibility, normally
`pipewire-alsa`.

## 3. YouTube error 153: root cause and resolution

YouTube defines IFrame API error 153 as a request without an HTTP Referer or
equivalent API client identity. WebKitGTK loaded the original player from the
custom `tauri://localhost` scheme. Although the iframe itself was on
`https://www.youtube.com`, that custom-scheme embedding context did not provide
the HTTP identity YouTube required. Changing codecs, user agent, or the selected
video could not solve a platform-wide identity failure.

Commit [`8826832`](https://github.com/svetlisashkov/cremeplay/commit/8826832e533ad0cd19445e655e4c3922a3f6ec35)
introduced the production Linux HTTP player host:

- `tauri-plugin-localhost` serves packaged assets on `127.0.0.1` at an
  ephemeral port;
- only the small bridge page is embedded by the main UI;
- the bridge creates the YouTube player with its own HTTP `window.location.origin`;
- `strict-origin-when-cross-origin` sends YouTube the loopback origin but not a
  local page path or query;
- the main page and all Tauri IPC remain at the original `tauri://localhost`
  origin.

This directly addressed the observed failure. In the subsequent real Linux
test, YouTube accepted the embedder identity, playback reached `playing`, audio
was heard, and error 153 was absent. That is experimental confirmation for the
tested environment, not a universal guarantee about YouTube's future policy.

The earlier diagnostic/fallback commits were also important:

- [`f46418a`](https://github.com/svetlisashkov/cremeplay/commit/f46418a1109627e422611142c2f9d84629a4a8f8)
  added iframe/native diagnostic separation and fixed Arch version generation;
- [`1b6784a`](https://github.com/svetlisashkov/cremeplay/commit/1b6784a71a87b5abd6ae79eaab9ac3304a7aa4da)
  stopped platform-wide/repeated errors from causing endless alternate searches;
- error 5 and 153 now stop immediately, while only documented video-specific
  errors 100, 101, 150, and 152 are eligible for at most two alternate-upload
  searches. Two distinct videos producing the same other error also stop the
  automatic sequence.

## 4. Local HTTP bridge security boundaries

The bridge was deliberately kept separate from the privileged application
origin:

- it binds to IPv4 loopback `127.0.0.1`, not all interfaces;
- the port is ephemeral and communicated internally by the Rust command;
- it is an in-process Tauri plugin, not a separately managed server process;
- [`src-tauri/capabilities/default.json`](src-tauri/capabilities/default.json)
  grants capabilities to the `main` and `auth` windows and remote Google/Music
  URLs; the loopback player origin is not granted Tauri IPC capability;
- the bridge exposes packaged static assets, not a dynamic filesystem, token,
  cookie, stream URL, or application-command API;
- the bridge page receives only validated load/cue/play/pause/seek/volume/quality
  messages. Video IDs must match the 11-character YouTube ID format;
- the parent validates the URL scheme, exact host, port, path, and absence of
  credentials before embedding it;
- incoming messages are accepted only from the exact iframe `contentWindow`
  and exact generated origin, with a fixed source marker, known message type,
  YouTube iframe origin, referrer policy, finite state/error fields, and valid
  video ID;
- response headers include `X-Content-Type-Options: nosniff`; the player HTML
  receives a CSP limited to local script, YouTube script/frame, inline style,
  no default sources, no base URI, and no forms;
- diagnostic payloads contain event/state/error code, video ID, origins,
  referrer/allow policy, user agent, and codec capability results. They do not
  contain cookies, tokens, or stream URLs.

The outer iframe uses `no-referrer` when navigating from `tauri://localhost` to
the loopback page. The inner YouTube embed uses
`strict-origin-when-cross-origin`, which is the identity needed by YouTube.

Residual considerations:

- the localhost plugin can serve packaged frontend assets on the selected port;
  the security boundary depends on the absence of IPC capability for that
  origin and the strict validation above;
- the port-selection helper briefly binds and releases a random port before the
  plugin binds it, leaving a small theoretical allocation race that was not
  observed;
- no formal security audit or measured long-duration resource test was done.

## 5. Authentication and catalog architecture

The UI does not load the full YouTube Music application. It calls Tauri
commands in [`src-tauri/src/commands.rs`](src-tauri/src/commands.rs), which in
turn use `InnertubeClient` in
[`src-tauri/src/innertube.rs`](src-tauri/src/innertube.rs).

Authentication works as follows:

1. `open_login_window()` opens a separate Tauri webview at Google's HTTPS login
   URL with the platform authentication user agent.
2. A background task polls cookies for `https://music.youtube.com` and regards
   `SAPISID`, `__Secure-3PAPISID`, or `LOGIN_INFO` as evidence of a signed-in
   session.
3. The cookie string is provided to `InnertubeClient` and persisted by
   `ConfigManager` in `config.json`; startup restores it in `run()`.
4. `InnertubeClient::apply_auth_headers_raw()` derives `SAPISIDHASH` and sets
   `X-Origin: https://music.youtube.com` for authenticated catalog requests.

Catalog/search/library functions include `search()`, `get_home_feed()`,
`get_explore_feed()`, `get_liked_songs()`, `get_user_playlists()`,
`get_radio_queue()`, and `get_playlist_or_album()`. Their corresponding Tauri
commands return typed data to the existing frontend.

Important limitation: these catalog calls and cookie handling use YouTube
Music's internal Innertube behavior, not a stable public YouTube Music API.
Client versions, response shapes, authentication requirements, and access
policy can change without notice. Cookies are stored in the application JSON
configuration rather than an OS credential vault. Neither pattern should be
carried unchanged into a new application.

## 6. Native audio extraction limitations

The native implementation is useful as a prototype but is not currently a
reliable production source:

- `get_audio_stream_url()` identifies itself as an Android Music client and
  calls an internal YouTube player endpoint;
- the real Linux test returned HTTP 400, before an audio URL was available;
- stream URLs, when available, are ephemeral and their format/policy is outside
  this application's control;
- `play_stream()` buffers the entire audio response in memory before decoding,
  so it is not true progressive streaming and can create avoidable latency and
  memory use;
- the native state, seek/progress, SponsorBlock, and iframe state are separate
  systems;
- the frontend starts both native and iframe attempts for the same selection,
  creating a duplicate-playback risk if extraction recovers;
- ALSA output through PipeWire compatibility was implemented, but the reported
  successful sound came from WebKitGTK/GStreamer iframe playback, not proof of
  the native output pipeline.

The native diagnostic prefixes correctly distinguish stages:

- `[Playback][Iframe]` — YouTube IFrame API state/error and WebKit media context;
- `[Playback][Native] Direct stream extraction unavailable` — player endpoint
  failed before a URL was obtained;
- `[Playback][Native] Stream decode/output failed` — URL acquisition succeeded
  but download, decoding, or the audio device failed;
- `[Playback][Native] Direct stream active` — the Rust player actually started.

## 7. Linux packaging and desktop integration

Relevant files:

- [`src-tauri/tauri.linux.conf.json`](src-tauri/tauri.linux.conf.json) enables
  `.deb` and AppImage targets and asks the AppImage builder to bundle the media
  framework;
- [`PKGBUILD`](PKGBUILD) declares the Arch build/runtime dependencies and
  installs the executable, Freedesktop launcher, hicolor icons, and license;
- [`packaging/linux/com.cremeplay.desktop.desktop`](packaging/linux/com.cremeplay.desktop.desktop)
  provides the KDE/Freedesktop launcher metadata;
- [`.github/workflows/linux-packages.yml`](.github/workflows/linux-packages.yml)
  builds x86_64 AppImage and Arch artifacts, validates ELF architecture and the
  desktop file, and uploads workflow artifacts;
- [`src-tauri/src/tray.rs`](src-tauri/src/tray.rs) initializes the Tauri system
  tray through GTK/Ayatana AppIndicator support;
- [`src-tauri/src/platform.rs`](src-tauri/src/platform.rs) disables global
  shortcuts gracefully in pure Wayland sessions where the implementation is
  unsupported.

Packaging history:

- [`5e8fe7c`](https://github.com/svetlisashkov/cremeplay/commit/5e8fe7c91da89dfd187aa1bdee2f4754dbcd794f)
  introduced the native Linux port;
- [`5e65c6b`](https://github.com/svetlisashkov/cremeplay/commit/5e65c6b245bf5ee925a8da2e0c5e4da664594b35)
  added Arch/AppImage distribution;
- [`f7a1bd4`](https://github.com/svetlisashkov/cremeplay/commit/f7a1bd454f3cecc17a33aec303d2c80feef02440)
  made CI use an HTTPS Git source pinned to the exact push commit or pull-request
  head commit;
- [`f46418a`](https://github.com/svetlisashkov/cremeplay/commit/f46418a1109627e422611142c2f9d84629a4a8f8)
  made `pkgver()` produce a nonempty Arch version both with and without matching
  `v*` tags.

### Remaining packaging and Linux issues

- The GitHub workflow uploads Actions artifacts; it does not publish a signed
  GitHub Release or package repository.
- The workflow pins `PKGBUILD` to the event commit, but the checked-in PKGBUILD's
  ordinary Git source follows the repository default branch. Until the Linux
  work is merged or released, running `makepkg` manually can therefore package
  `main` rather than `feature/linux-support`. A future maintainer should package
  an immutable release tag/commit, not a long-lived feature branch.
- The README's manual clone example also defaults to `main`; users of the
  unmerged port must explicitly check out `feature/linux-support`.
- The package is x86_64 only. There is no aarch64 build or validation.
- Package/AppImage artifacts are not cryptographically signed and there is no
  reproducible-build attestation or SBOM.
- `tauri-plugin-localhost` is enabled only under
  `cfg(all(target_os = "linux", not(dev)))`. Linux `tauri dev` uses the direct
  custom-scheme iframe path and can still encounter error 153; production
  package behavior must be tested with a release bundle.
- Pure Wayland global shortcuts are intentionally disabled. Tray behavior uses
  Ayatana AppIndicator and was implemented for KDE, but desktop-specific tray
  variations remain possible.
- AppImage media bundling does not prove compatibility with every host
  WebKitGTK/GStreamer combination. The successful EndeavourOS setup is the
  confirmed compatibility point.

## 8. Capturing Linux playback diagnostics

Run the AppImage from a terminal:

```bash
RUST_LOG=info GST_DEBUG=2 ./Cremeplay_*_amd64.AppImage 2>&1 | tee cremeplay-playback.log
```

For an installed Arch package, replace the AppImage path with `cremeplay`.
Record media components and decoder availability:

```bash
pacman -Q webkit2gtk-4.1 gst-plugins-base gst-plugins-good gst-libav pipewire-alsa \
  2>&1 | tee -a cremeplay-playback.log
gst-inspect-1.0 opusdec 2>&1 | tee -a cremeplay-playback.log
gst-inspect-1.0 avdec_aac 2>&1 | tee -a cremeplay-playback.log
```

A healthy bridge run should contain:

- `Linux YouTube player host configured` with a `127.0.0.1` URL;
- `[Playback][Iframe] event=ready` with `page_origin=tauri://localhost`, an HTTP
  `player_host_origin`, and `strict-origin-when-cross-origin`;
- state transitions through buffering/playing for the selected video ID;
- no `error_code=153`.

Also inspect `[Playback][Native]` separately; a native HTTP 400 does not mean
the iframe failed. Remove cookies, authorization values, account data, and any
unexpected URLs before sharing logs. The application diagnostics are designed
not to log those values, but GStreamer/WebKit output should still be reviewed.

## 9. Recommendations for MusicAmp (Rust + Qt 6)

### Decide the legal and technical media source first

YouTube Music does not provide a general public API that supplies arbitrary
consumer playback streams. A new application cannot simultaneously guarantee
full YouTube Music playback, avoid a browser/embed, and rely only on stable
official interfaces unless Google provides an appropriate licensed API or SDK.
Do not design around spoofed clients, copied internal API keys, signature
workarounds, or cookie scraping.

For a browser-free MusicAmp, prefer one or more of:

- local files and user-owned libraries;
- radio/podcast/music providers with documented playback APIs and explicit
  desktop-client terms;
- user-supplied, authorized media URLs;
- official OAuth in the system browser, only for scopes and operations the
  provider officially supports.

If YouTube playback remains a hard requirement, isolate an official embed in a
small, capability-free Qt WebEngine surface and accept its Chromium/resource
cost. Give it a legitimate HTTP(S) origin and a narrow message protocol. Do not
mix that web player with a second native player for the same track.

### Suggested application boundary

- Put domain models, queue policy, provider clients, cache, and diagnostics in
  a Rust core.
- Use Qt 6/QML for presentation, Wayland integration, notifications, and KDE
  tray behavior. Keep the Rust/Qt boundary narrow; CXX-Qt is a reasonable
  option for typed QObject models and signals.
- Define a `PlaybackBackend` interface with exactly one active owner. A Qt
  Multimedia/GStreamer backend is appropriate for local files or legitimate
  direct URLs; an embed backend, if unavoidable, should be mutually exclusive.
- Model provider, authentication, extraction, decoder, output-device, and
  policy failures as separate structured errors. Add a circuit breaker for
  repeated platform-wide errors rather than searching/skipping indefinitely.
- Stream and decode incrementally with bounded buffers instead of downloading a
  full track into memory.
- Use the Freedesktop Secret Service/KWallet for refresh tokens or cookies and
  never store session credentials in a plain JSON settings file.
- Prefer system-browser OAuth with PKCE and a short-lived loopback callback over
  an embedded login page, when the provider supports it.
- Test Qt Multimedia against PipeWire/GStreamer on KDE Plasma Wayland, including
  suspend/resume, device changes, media keys, tray lifecycle, Opus/AAC, and
  long-running memory behavior.
- Build Arch packages in a clean Arch environment, pin immutable source
  revisions, publish checksums/signatures and an SBOM, and test the installed
  desktop file/icon—not only the build-tree binary.

### Lessons to retain

1. Custom application schemes are not always equivalent to HTTP origins for
   third-party embed identity. Test the complete production origin/referrer
   chain early.
2. Diagnostics must name the failing pipeline and stage. The iframe error 153
   and native HTTP 400 were independent failures.
3. One selection should have one playback authority. Independent simultaneous
   players make state, audio, seeking, and fallback behavior ambiguous.
4. Bound automatic recovery. Platform-wide failures should stop and produce an
   actionable diagnostic rather than churn through tracks.
5. Treat internal service APIs and stored browser cookies as volatile and
   security-sensitive, not as a stable application contract.
6. Real KDE/Wayland/AppImage testing found the decisive issue that headless
   compilation could not reproduce. Keep a small hardware regression matrix.

## 10. Closure

The Linux port ends with a real, successful AppImage playback result through
the localhost-hosted YouTube IFrame API and with error 153 resolved in the
tested EndeavourOS environment. The native Rust extraction path remains
unreliable, and the packaging/security limitations above remain work for any
future maintainer. Active development should move to MusicAmp with the media
source, authentication contract, and single playback owner decided before UI
implementation.
