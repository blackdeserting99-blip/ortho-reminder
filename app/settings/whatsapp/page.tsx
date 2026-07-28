"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    FB?: {
      init: (config: Record<string, unknown>) => void;
      login: (
        callback: (response: {
          status?: string;
          authResponse?: {
            accessToken?: string;
            code?: string;
          };
        }) => void,
        options?: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

type ConnectInitResponse = {
  ok?: boolean;
  appId?: string;
  configId?: string;
  callbackUrl?: string;
  graphApiVersion?: string;
  connected?: boolean;
  error?: string;
};

type EmbeddedSignupMessage = {
  type?: string;
  event?: string;
  data?: {
    waba_id?: string;
    phone_number_id?: string;
  };
};

function parseEmbeddedSignupMessage(eventData: unknown): EmbeddedSignupMessage | null {
  if (!eventData) {
    return null;
  }

  if (typeof eventData === "string") {
    try {
      const parsed = JSON.parse(eventData);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      return parsed as EmbeddedSignupMessage;
    } catch {
      return null;
    }
  }

  if (typeof eventData === "object") {
    return eventData as EmbeddedSignupMessage;
  }

  return null;
}

export default function WhatsAppSetupPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [checking, setChecking] = useState(true);
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [connectError, setConnectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);

  const [appId, setAppId] = useState("");
  const [configId, setConfigId] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [graphApiVersion, setGraphApiVersion] = useState("v21.0");
  const [sdkReady, setSdkReady] = useState(false);

  const [embeddedWabaId, setEmbeddedWabaId] = useState("");
  const [embeddedPhoneNumberId, setEmbeddedPhoneNumberId] = useState("");

  const canConnect = useMemo(() => {
    return Boolean(sdkReady && appId && configId && callbackUrl);
  }, [sdkReady, appId, configId, callbackUrl]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (typeof event.origin !== "string" || !event.origin.includes("facebook.com")) {
        return;
      }

      const parsed = parseEmbeddedSignupMessage(event.data);
      if (!parsed) {
        return;
      }

      if (parsed.type === "WA_EMBEDDED_SIGNUP" && parsed.event === "FINISH") {
        setEmbeddedWabaId((parsed.data?.waba_id || "").trim());
        setEmbeddedPhoneNumberId((parsed.data?.phone_number_id || "").trim());
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const setupRes = await fetch("/api/settings/doctor-whatsapp", {
          cache: "no-store",
        });
        const setupData = await setupRes.json().catch(() => ({}));

        if (!mounted) return;

        setPhone(setupData.phone || "");
        setConnected(Boolean(setupData.connected));
        setConnectedAt(setupData?.whatsapp?.connectedAt || null);

        const connectRes = await fetch("/api/settings/doctor-whatsapp/connect", {
          cache: "no-store",
        });
        const connectData = (await connectRes.json().catch(() => ({}))) as ConnectInitResponse;

        if (!mounted) return;

        if (!connectRes.ok) {
          setConnectError(connectData.error || "Failed to initialize Meta Embedded Signup.");
        } else {
          setAppId((connectData.appId || "").trim());
          setConfigId((connectData.configId || "").trim());
          setCallbackUrl((connectData.callbackUrl || "").trim());
          setGraphApiVersion((connectData.graphApiVersion || "v21.0").trim());
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!appId || checking) {
      return;
    }

    if (window.FB) {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: graphApiVersion,
      });
      setSdkReady(true);
      return;
    }

    const scriptId = "facebook-jssdk";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      window.fbAsyncInit = () => {
        window.FB?.init({
          appId,
          cookie: true,
          xfbml: false,
          version: graphApiVersion,
        });
        setSdkReady(true);
      };
      return;
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: graphApiVersion,
      });
      setSdkReady(true);
    };

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onerror = () => {
      setConnectError("Failed to load Facebook SDK.");
    };
    document.body.appendChild(script);
  }, [appId, graphApiVersion, checking]);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setSavingPhone(true);

    try {
      const res = await fetch("/api/settings/doctor-whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhoneError(data.error || "Failed to save phone number.");
        return;
      }

      document.cookie = "whatsapp_configured=1; path=/; max-age=604800; secure; samesite=lax";
    } catch {
      setPhoneError("Network error while saving phone number.");
    } finally {
      setSavingPhone(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    setConnectError(null);

    if (!window.FB) {
      setConnectError("Facebook SDK is not ready yet.");
      return;
    }

    if (!configId) {
      setConnectError(
        "META_EMBEDDED_SIGNUP_CONFIG_ID is missing. Configure it in the environment."
      );
      return;
    }

    if (!callbackUrl) {
      setConnectError("CALLBACK_URL is missing. Configure it in the environment.");
      return;
    }

    setConnecting(true);

    window.FB.login(
      async (response) => {
        try {
          const code = (response?.authResponse?.code || "").trim();
          if (!code) {
            setConnectError("Meta login did not return OAuth code.");
            return;
          }

          const callbackRes = await fetch("/api/settings/doctor-whatsapp/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              businessAccountId: embeddedWabaId,
              phoneNumberId: embeddedPhoneNumberId,
            }),
          });

          const callbackData = await callbackRes.json().catch(() => ({}));
          if (!callbackRes.ok) {
            setConnectError(
              callbackData.error || "Failed to complete WhatsApp Business connection."
            );
            return;
          }

          setConnected(true);
          setConnectedAt(callbackData.connectedAt || new Date().toISOString());
          document.cookie = "whatsapp_configured=1; path=/; max-age=604800; secure; samesite=lax";
        } catch {
          setConnectError("Failed to complete Meta signup callback.");
        } finally {
          setConnecting(false);
        }
      },
      {
        scope:
          "business_management,whatsapp_business_management,whatsapp_business_messaging",
        response_type: "code",
        override_default_response_type: true,
        extras: {
          feature: "whatsapp_embedded_signup",
          sessionInfoVersion: 3,
        },
        config_id: configId,
        redirect_uri: callbackUrl,
      }
    );
  };

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200/80 bg-white/95 p-8 shadow-xl shadow-slate-900/10">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 text-3xl">
            💬
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">
            Required Setup
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Connect WhatsApp Business
          </h1>
          <p className="text-sm text-slate-600">
            Each doctor sends reminders from their own WhatsApp Business number.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-slate-700">Status</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {connected ? "Connected" : "Not connected"}
            </span>
          </div>
          {connectedAt && (
            <p className="mt-2 text-xs text-slate-500">
              Connected at: {new Date(connectedAt).toLocaleString()}
            </p>
          )}
        </div>

        {connectError && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {connectError}
          </p>
        )}

        <button
          type="button"
          onClick={handleConnectWhatsApp}
          disabled={connecting || !canConnect}
          className="mt-6 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect WhatsApp"}
        </button>

        <form className="mt-8 space-y-6 border-t border-slate-200 pt-6" onSubmit={handleSavePhone}>
          <h2 className="text-sm font-semibold text-slate-800">Clinic Contact Phone (Optional)</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              WhatsApp Contact Phone
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                placeholder="e.g. 07701234567"
                required
              />
            </label>
          </div>

          {phoneError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {phoneError}
            </p>
          )}

          <button
            type="submit"
            disabled={savingPhone || !phone.trim()}
            className="w-full rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-cyan-700 disabled:opacity-50"
          >
            {savingPhone ? "Saving..." : "Save Phone"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push("/patients")}
          className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Continue to Dashboard
        </button>
      </section>
    </main>
  );
}
