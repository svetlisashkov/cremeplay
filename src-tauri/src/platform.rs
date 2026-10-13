use std::path::PathBuf;

const APP_ID: &str = "com.cremeplay.desktop";

pub fn prepare_runtime() {
    #[cfg(target_os = "linux")]
    {
        let session = std::env::var("XDG_SESSION_TYPE").unwrap_or_else(|_| "unknown".into());
        let wayland = std::env::var_os("WAYLAND_DISPLAY").is_some();
        let x11 = std::env::var_os("DISPLAY").is_some();
        let pipewire = std::env::var_os("XDG_RUNTIME_DIR")
            .map(PathBuf::from)
            .map(|path| path.join("pipewire-0").exists())
            .unwrap_or(false);

        eprintln!(
            "[Cremeplay] Linux session: type={session}, wayland={wayland}, x11={x11}, pipewire={pipewire}"
        );
    }
}

pub fn panic_log_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        return std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(std::env::temp_dir)
            .join(APP_ID)
            .join("logs");
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(state_home) = std::env::var_os("XDG_STATE_HOME") {
            return PathBuf::from(state_home).join(APP_ID).join("logs");
        }

        if let Some(home) = std::env::var_os("HOME") {
            return PathBuf::from(home)
                .join(".local")
                .join("state")
                .join(APP_ID)
                .join("logs");
        }

        return std::env::temp_dir().join(APP_ID).join("logs");
    }

    #[cfg(target_os = "macos")]
    {
        return std::env::var_os("HOME")
            .map(PathBuf::from)
            .unwrap_or_else(std::env::temp_dir)
            .join("Library")
            .join("Logs")
            .join(APP_ID);
    }

    #[allow(unreachable_code)]
    std::env::temp_dir().join(APP_ID).join("logs")
}

pub fn authentication_user_agent() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
    }

    #[cfg(target_os = "linux")]
    {
        return "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
    }

    #[cfg(target_os = "macos")]
    {
        return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
    }

    #[allow(unreachable_code)]
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
}

pub fn global_shortcuts_supported() -> bool {
    #[cfg(target_os = "linux")]
    {
        // global-hotkey currently uses X11 on Linux. KDE Plasma Wayland exposes
        // XWayland through DISPLAY; pure Wayland sessions must not fail startup.
        return std::env::var_os("DISPLAY").is_some();
    }

    #[cfg(not(target_os = "linux"))]
    {
        true
    }
}
