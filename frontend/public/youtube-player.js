(() => {
  'use strict';

  const HOST_MESSAGE_SOURCE = 'cremeplay-youtube-host-v1';
  const APP_MESSAGE_SOURCE = 'cremeplay-main-v1';
  const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
  const ALLOWED_QUALITIES = new Set([
    'default',
    'small',
    'medium',
    'large',
    'hd720',
    'hd1080',
    'highres',
    'auto',
  ]);

  let player = null;
  let ready = false;

  function getIframe() {
    try {
      return player?.getIframe?.() || document.querySelector('#youtube-player iframe');
    } catch {
      return document.querySelector('#youtube-player iframe');
    }
  }

  function finiteNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function playerValue(method, fallback) {
    try {
      const value = player?.[method]?.();
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function playerMetadata() {
    const iframe = getIframe();
    return {
      playerHostOrigin: window.location.origin,
      iframeOrigin: 'https://www.youtube.com',
      iframeReferrerPolicy: iframe?.referrerPolicy || 'strict-origin-when-cross-origin',
      playerState: finiteNumber(playerValue('getPlayerState', -1), -1),
      currentTime: finiteNumber(playerValue('getCurrentTime', 0)),
      duration: finiteNumber(playerValue('getDuration', 0)),
    };
  }

  function send(type, payload = {}) {
    window.parent.postMessage(
      {
        source: HOST_MESSAGE_SOURCE,
        type,
        ...playerMetadata(),
        ...payload,
      },
      '*',
    );
  }

  function configureIframe() {
    const iframe = getIframe();
    if (!iframe) return;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  }

  function validatedVideoRequest(payload) {
    const videoId = typeof payload?.videoId === 'string' ? payload.videoId : '';
    if (!VIDEO_ID_PATTERN.test(videoId)) return null;

    const request = { videoId };
    const startSeconds = finiteNumber(payload?.startSeconds, 0);
    if (startSeconds > 0) request.startSeconds = startSeconds;
    if (ALLOWED_QUALITIES.has(payload?.suggestedQuality)) {
      request.suggestedQuality = payload.suggestedQuality;
    }
    return request;
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const message = event.data;
    if (!message || message.source !== APP_MESSAGE_SOURCE || typeof message.type !== 'string') return;
    if (!ready || !player) return;

    try {
      switch (message.type) {
        case 'load': {
          const request = validatedVideoRequest(message.payload);
          if (request) player.loadVideoById(request);
          break;
        }
        case 'cue': {
          const request = validatedVideoRequest(message.payload);
          if (request) player.cueVideoById(request);
          break;
        }
        case 'play':
          player.playVideo();
          break;
        case 'pause':
          player.pauseVideo();
          break;
        case 'seek':
          player.seekTo(Math.max(0, finiteNumber(message.payload?.seconds, 0)), true);
          break;
        case 'volume':
          player.setVolume(Math.min(100, Math.max(0, finiteNumber(message.payload?.volume, 100))));
          break;
        case 'quality':
          if (ALLOWED_QUALITIES.has(message.payload?.quality)) {
            player.setPlaybackQuality(message.payload.quality);
          }
          break;
        default:
          return;
      }
      send('status');
    } catch (error) {
      send('bridge-error', { message: String(error).slice(0, 200) });
    }
  });

  window.onYouTubeIframeAPIReady = () => {
    player = new window.YT.Player('youtube-player', {
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        enablejsapi: 1,
        fs: 0,
        playsinline: 1,
        rel: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          ready = true;
          configureIframe();
          send('ready');
        },
        onStateChange: (event) => {
          send('state', { playerState: finiteNumber(event.data, -1) });
        },
        onError: (event) => {
          const videoData = playerValue('getVideoData', {});
          send('error', {
            errorCode: finiteNumber(event.data, 0),
            videoId: typeof videoData?.video_id === 'string' ? videoData.video_id : null,
          });
        },
        onAutoplayBlocked: () => send('autoplay-blocked'),
      },
    });
    configureIframe();
  };

  setInterval(() => {
    if (ready && finiteNumber(playerValue('getPlayerState', -1), -1) === 1) {
      send('status');
    }
  }, 250);

  const api = document.createElement('script');
  api.src = 'https://www.youtube.com/iframe_api';
  api.referrerPolicy = 'strict-origin-when-cross-origin';
  document.head.appendChild(api);
})();
