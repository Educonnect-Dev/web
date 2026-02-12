import { useEffect, useRef, useState } from "react";

const DEFAULT_DOMAIN = "meet.jit.si";

function loadJitsiScript(domain) {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.JitsiMeetExternalAPI) return Promise.resolve(window.JitsiMeetExternalAPI);
  if (window.__jitsiScriptPromise) return window.__jitsiScriptPromise;

  const script = document.createElement("script");
  script.src = `https://${domain}/external_api.js`;
  script.async = true;

  window.__jitsiScriptPromise = new Promise((resolve, reject) => {
    script.onload = () => resolve(window.JitsiMeetExternalAPI || null);
    script.onerror = () => reject(new Error("JITSI_SCRIPT_LOAD_FAILED"));
  });

  document.body.appendChild(script);
  return window.__jitsiScriptPromise;
}

export function JitsiMeeting({ roomName, userName, role = "student" }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const isTeacher = role === "teacher";

    async function init() {
      try {
        const domain = import.meta.env.VITE_JITSI_DOMAIN || DEFAULT_DOMAIN;
        const JitsiMeetExternalAPI = await loadJitsiScript(domain);
        if (!mounted || !JitsiMeetExternalAPI) return;
        if (!containerRef.current) return;

        const configOverwrite = {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: !isTeacher,
          disableInviteFunctions: !isTeacher,
        };

        const interfaceConfigOverwrite = isTeacher
          ? {}
          : {
              TOOLBAR_BUTTONS: ["microphone", "chat", "hangup"],
            };

        apiRef.current = new JitsiMeetExternalAPI(domain, {
          roomName,
          parentNode: containerRef.current,
          userInfo: {
            displayName: userName,
          },
          configOverwrite,
          interfaceConfigOverwrite,
        });

        apiRef.current.addEventListener("participantJoined", (payload) => {
          console.log("JITSI_PARTICIPANT_JOINED", payload);
        });
        apiRef.current.addEventListener("videoConferenceLeft", (payload) => {
          console.log("JITSI_CONFERENCE_LEFT", payload);
        });
      } catch (err) {
        console.error("JITSI_INIT_ERROR", err);
        if (mounted) setError("Impossible de charger Jitsi.");
      }
    }

    if (roomName) {
      void init();
    }

    return () => {
      mounted = false;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, userName]);

  if (!roomName) return null;

  if (error) {
    return <div className="form-error">{error}</div>;
  }

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
