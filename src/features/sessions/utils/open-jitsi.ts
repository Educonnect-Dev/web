type OpenJitsiOptions = {
  promptOnIos?: boolean;
  iosPromptMessage?: string;
};

export function openJitsiMeetingInBrowserOnly(meetingUrl: string) {
  if (typeof window === "undefined") return;
  window.location.assign(meetingUrl);
}

export function openJitsiMeetingPreferApp(meetingUrl: string, options: OpenJitsiOptions = {}) {
  if (typeof window === "undefined") return;

  if (!isMobileOrTabletDevice()) {
    const popup = window.open(meetingUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      // Some tablet browsers/webviews block popups even on direct click.
      window.location.assign(meetingUrl);
    }
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(meetingUrl);
  } catch {
    window.location.assign(meetingUrl);
    return;
  }

  const platform = getMobilePlatform();
  if (platform === "ios") {
    const shouldPrompt = options.promptOnIos ?? true;
    if (shouldPrompt) {
      const promptMessage = options.iosPromptMessage ?? "Ouvrir dans l'app Jitsi ?";
      const shouldOpenApp = window.confirm(promptMessage);
      if (!shouldOpenApp) {
        window.location.assign(meetingUrl);
        return;
      }
    }
    const appUrl = buildIosJitsiSchemeUrl(parsedUrl);
    openWithFallbackToWeb(appUrl, meetingUrl);
    return;
  }

  const appUrl = platform === "android" ? buildAndroidJitsiIntentUrl(parsedUrl, meetingUrl) : meetingUrl;
  openWithFallbackToWeb(appUrl, meetingUrl);
}

function buildAndroidJitsiIntentUrl(parsedUrl: URL, fallbackUrl: string) {
  const path = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  const safeFallbackUrl = encodeURIComponent(fallbackUrl);
  return `intent://${parsedUrl.host}${path}#Intent;scheme=https;package=org.jitsi.meet;S.browser_fallback_url=${safeFallbackUrl};end`;
}

function buildIosJitsiSchemeUrl(parsedUrl: URL) {
  const path = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  return `org.jitsi.meet://${parsedUrl.host}${path}`;
}

function openWithFallbackToWeb(appUrl: string, fallbackUrl: string) {
  let fallbackTriggered = false;

  const fallbackToWeb = () => {
    if (fallbackTriggered) return;
    fallbackTriggered = true;
    cleanup();
    window.location.assign(fallbackUrl);
  };

  const cancelFallback = () => {
    cleanup();
  };

  const timer = window.setTimeout(fallbackToWeb, 1400);

  const onVisibilityChange = () => {
    if (document.hidden) {
      cancelFallback();
    }
  };

  const cleanup = () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", cancelFallback);
    window.removeEventListener("blur", cancelFallback);
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", cancelFallback, { once: true });
  window.addEventListener("blur", cancelFallback, { once: true });
  window.location.assign(appUrl);
}

function isMobileOrTabletDevice() {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const isMobileUa = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const isIpadDesktopMode =
    navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;

  return isMobileUa || isIpadDesktopMode;
}

function getMobilePlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const userAgent = navigator.userAgent || "";
  if (/Android/i.test(userAgent)) return "android";
  const isIosUa = /iPhone|iPad|iPod/i.test(userAgent);
  const isIpadDesktopMode =
    navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  if (isIosUa || isIpadDesktopMode) return "ios";
  return "other";
}
