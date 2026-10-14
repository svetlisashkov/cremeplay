# Maintainer: Cremeplay contributors

pkgname=cremeplay-git
pkgver=1.1.0.r19.g5e8fe7c
pkgrel=2
pkgdesc="Lightweight native YouTube Music client built with Tauri and Rust"
arch=('x86_64')
url="https://github.com/svetlisashkov/cremeplay"
license=('MIT')
options=('!debug')
depends=(
  'alsa-lib'
  'gtk3'
  'hicolor-icon-theme'
  'libayatana-appindicator'
  'webkit2gtk-4.1'
)
makedepends=(
  'git'
  'nodejs'
  'pnpm'
  'rust'
)
optdepends=(
  'pipewire-alsa: PipeWire audio through the ALSA compatibility layer'
  'gst-plugins-good: WebKit media playback support'
  'gst-libav: additional WebKit media codecs'
  'discord: Discord Rich Presence integration'
)
provides=('cremeplay')
conflicts=('cremeplay')
source=('cremeplay::git+https://github.com/svetlisashkov/cremeplay.git')
sha256sums=('SKIP')

pkgver() {
  cd cremeplay

  local version
  if version="$(git describe --long --tags --match 'v[0-9]*' --abbrev=7 2>/dev/null)"; then
    version="$(printf '%s' "$version" | sed \
      -e 's/^v//' \
      -e 's/\([^-]*-g\)/r\1/' \
      -e 's/-/./g' \
      -e 's/[^[:alnum:]+._]/./g')"
    if [[ -n "$version" ]]; then
      printf '%s\n' "$version"
      return
    fi
  fi

  local revision short_commit
  revision="$(git rev-list --count HEAD 2>/dev/null || printf '0')"
  short_commit="$(git rev-parse --short=7 HEAD 2>/dev/null || printf 'unknown')"
  printf '1.1.0.r%s.g%s\n' "${revision:-0}" "${short_commit:-unknown}"
}

prepare() {
  cd cremeplay
  pnpm install --frozen-lockfile
  cargo fetch --locked --manifest-path src-tauri/Cargo.toml
}

build() {
  cd cremeplay
  pnpm build:frontend
  CARGO_NET_OFFLINE=true cargo build --release --frozen \
    --manifest-path src-tauri/Cargo.toml
}

check() {
  cd cremeplay
  CARGO_NET_OFFLINE=true cargo test --frozen \
    --manifest-path src-tauri/Cargo.toml
}

package() {
  cd cremeplay

  install -Dm755 src-tauri/target/release/cremeplay \
    "$pkgdir/usr/bin/cremeplay"
  install -Dm644 packaging/linux/com.cremeplay.desktop.desktop \
    "$pkgdir/usr/share/applications/com.cremeplay.desktop.desktop"
  install -Dm644 src-tauri/icons/128x128.png \
    "$pkgdir/usr/share/icons/hicolor/128x128/apps/com.cremeplay.desktop.png"
  install -Dm644 src-tauri/icons/128x128@2x.png \
    "$pkgdir/usr/share/icons/hicolor/256x256/apps/com.cremeplay.desktop.png"
  install -Dm644 LICENSE \
    "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
}
