# Maintainer: Cremeplay contributors

pkgname=cremeplay-git
pkgver=1.1.0.r0.g5f39623
pkgrel=1
pkgdesc="Lightweight native YouTube Music client built with Tauri and Rust"
arch=('x86_64')
url="https://github.com/svetlisashkov/cremeplay"
license=('MIT')
depends=(
  'alsa-lib'
  'gtk3'
  'libayatana-appindicator'
  'webkit2gtk-4.1'
)
makedepends=(
  'cargo'
  'git'
  'nodejs'
  'pnpm'
)
optdepends=(
  'pipewire-alsa: PipeWire audio through the ALSA compatibility layer'
  'discord: Discord Rich Presence integration'
)
provides=('cremeplay')
conflicts=('cremeplay')
source=('cremeplay::git+https://github.com/svetlisashkov/cremeplay.git')
sha256sums=('SKIP')

pkgver() {
  cd cremeplay
  git describe --long --tags --abbrev=7 2>/dev/null | sed 's/^v//;s/\([^-]*-g\)/r\1/;s/-/./g' || \
    printf '1.1.0.r%s.g%s' "$(git rev-list --count HEAD)" "$(git rev-parse --short=7 HEAD)"
}

prepare() {
  cd cremeplay
  pnpm install --frozen-lockfile
}

build() {
  cd cremeplay
  pnpm build:frontend
  cargo build --release --locked --manifest-path src-tauri/Cargo.toml
}

check() {
  cd cremeplay
  cargo check --locked --manifest-path src-tauri/Cargo.toml
}

package() {
  cd cremeplay

  install -Dm755 src-tauri/target/release/cremeplay \
    "$pkgdir/usr/bin/cremeplay"
  install -Dm644 packaging/linux/com.cremeplay.desktop.desktop \
    "$pkgdir/usr/share/applications/com.cremeplay.desktop.desktop"
  install -Dm644 frontend/public/cremeplay.png \
    "$pkgdir/usr/share/icons/hicolor/512x512/apps/com.cremeplay.desktop.png"
  install -Dm644 LICENSE \
    "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
}
