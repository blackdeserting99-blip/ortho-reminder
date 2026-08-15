"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MeResponse = {
  id?: string;
  name?: string | null;
  email?: string | null;
};

type SettingsResponse = {
  phone?: string;
  connected?: boolean;
  whatsapp?: {
    connectedAt?: string | null;
    businessAccountIdMasked?: string;
    phoneNumberIdMasked?: string;
  };
};

type MetaConfigResponse = {
  ok?: boolean;
  appId?: string;
  configId?: string;
  graphVersion?: string;
  redirectUri?: string | null;
  error?: string;
};

type SignupEventData = {
  businessAccountId: string;
  phoneNumberId: string;
};

type MetaSignupMessage = {
  type?: unknown;
  event?: unknown;
  data?: {
    waba_id?: unknown;
    phone_number_id?: unknown;
    error_message?: unknown;
  };
};

declare global {
  interface Window {
    FB?: {
      init: (params: Record<string, unknown>) => void;
      login: (
        callback: (response: {
          status?: string;
          authResponse?: { code?: string };
        }) => void,
        options?: Record<string, unknown>
      ) => void;
    };
  }
}

export default function WhatsAppSetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [currentUserLabel, setCurrentUserLabel] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [savedBusinessAccountIdMasked, setSavedBusinessAccountIdMasked] = useState("");
  const [savedPhoneNumberIdMasked, setSavedPhoneNumberIdMasked] = useState("");
  const [phone, setPhone] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [debugOutput, setDebugOutput] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [savingPhone, setSavingPhone] = useState(false);
  const [metaConfig, setMetaConfig] = useState<MetaConfigResponse | null>(null);
  const [pendingSignupCode, setPendingSignupCode] = useState<string | null>(null);
  const [pendingSignupData, setPendingSignupData] = useState<SignupEventData | null>(null);

  const reloadSettings = async () => {
    const response = await fetch("/api/settings/doctor-whatsapp", { cache: "no-store" });
    const settingsData = (await response.json().catch(() => ({}))) as SettingsResponse;
    setConnected(Boolean(settingsData.connected));
    setConnectedAt(settingsData.whatsapp?.connectedAt || null);
    setSavedBusinessAccountIdMasked(settingsData.whatsapp?.businessAccountIdMasked || "");
    setSavedPhoneNumberIdMasked(settingsData.whatsapp?.phoneNumberIdMasked || "");
    setPhone(settingsData.phone || "");
    setTestPhone(settingsData.phone || "");
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [settingsRes, meRes, metaConfigRes] = await Promise.all([
          fetch("/api/settings/doctor-whatsapp", { cache: "no-store" }),
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/settings/doctor-whatsapp/meta/config", { cache: "no-store" }),
        ]);

        const settingsData = (await settingsRes.json().catch(() => ({}))) as SettingsResponse;
        const meData = (await meRes.json().catch(() => ({}))) as MeResponse;
        const configData = (await metaConfigRes.json().catch(() => ({}))) as MetaConfigResponse;

        if (!mounted) {
          return;
        }

        const userName = (meData.name || "").trim();
        const userEmail = (meData.email || "").trim();
        const userId = (meData.id || "").trim();
        setCurrentUserLabel(userName || userEmail || userId || "Unknown user");
        setConnected(Boolean(settingsData.connected));
        setConnectedAt(settingsData.whatsapp?.connectedAt || null);
        setSavedBusinessAccountIdMasked(settingsData.whatsapp?.businessAccountIdMasked || "");
        setSavedPhoneNumberIdMasked(settingsData.whatsapp?.phoneNumberIdMasked || "");
        setPhone(settingsData.phone || "");
        setTestPhone(settingsData.phone || "");
        setMetaConfig(configData);
      } catch {
        if (mounted) {
          setMetaConfig({
            ok: false,
            error: "Meta configuration is temporarily unavailable.",
          });
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!metaConfig?.appId || !metaConfig?.graphVersion) {
      return;
    }

    const existing = document.getElementById("facebook-jssdk");
    if (existing) {
      if (window.FB) {
        window.FB.init({
          appId: metaConfig.appId,
          xfbml: false,
          cookie: false,
          version: metaConfig.graphVersion,
        });
        setSdkReady(true);
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.onload = () => {
      if (window.FB) {
        window.FB.init({
          appId: metaConfig.appId,
          xfbml: false,
          cookie: false,
          version: metaConfig.graphVersion,
        });
        setSdkReady(true);
      }
    };
    document.body.appendChild(script);
  }, [metaConfig?.appId, metaConfig?.graphVersion]);

  const finalizeEmbeddedSignup = async (code: string, signupData: SignupEventData) => {
    setConnectLoading(true);
    setStatusMessage(null);
    setStatusError(null);
    setDebugOutput(null);

    try {
      const response = await fetch("/api/settings/doctor-whatsapp/meta/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          phoneNumberId: signupData.phoneNumberId,
          businessAccountId: signupData.businessAccountId,
          phone,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatusError(data.error || data.details || "Failed to complete Meta signup.");
        return;
      }

      await reloadSettings();
      setStatusMessage("Meta WhatsApp connected successfully.");
    } catch {
      setStatusError("Network error while completing Meta signup.");
    } finally {
      setConnectLoading(false);
      setPendingSignupCode(null);
      setPendingSignupData(null);
    }
  };

  useEffect(() => {
    if (!pendingSignupCode || !pendingSignupData) {
      return;
    }

    void finalizeEmbeddedSignup(pendingSignupCode, pendingSignupData);
  }, [pendingSignupCode, pendingSignupData]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      try {
        if (!new URL(event.origin).hostname.endsWith("facebook.com")) {
          return;
        }
      } catch {
        return;
      }

      if (typeof event.data !== "string") {
        return;
      }

      let payload: MetaSignupMessage;
      try {
        payload = JSON.parse(event.data) as MetaSignupMessage;
      } catch {
        return;
      }

      if (payload?.type !== "WA_EMBEDDED_SIGNUP") {
        return;
      }

      if (payload?.event === "FINISH") {
        const businessAccountId = String(payload?.data?.waba_id || "").trim();
        const phoneNumberId = String(payload?.data?.phone_number_id || "").trim();
        if (businessAccountId && phoneNumberId) {
          setPendingSignupData({ businessAccountId, phoneNumberId });
        }
      }

      if (payload?.event === "CANCEL") {
        setConnectLoading(false);
        setStatusError("Meta signup was cancelled.");
      }

      if (payload?.event === "ERROR") {
        setConnectLoading(false);
        setStatusError(
          typeof payload.data?.error_message === "string"
            ? payload.data.error_message
            : "Meta signup failed."
        );
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  const handleStartEmbeddedSignup = async () => {
    if (!window.FB || !metaConfig?.configId) {
      setStatusError("Meta SDK is not ready yet. Please try again.");
      return;
    }

    setConnectLoading(true);
    setStatusMessage(null);
    setStatusError(null);
    setDebugOutput(null);

    window.FB.login(
      (response) => {
        const code = String(response?.authResponse?.code || "").trim();
        if (!code) {
          setConnectLoading(false);
          setStatusError("Meta signup did not return an authorization code.");
          return;
        }
        setPendingSignupCode(code);
      },
      {
        config_id: metaConfig.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          feature: "whatsapp_embedded_signup",
          sessionInfoVersion: 3,
        },
      }
    );
  };

  const handleStartHostedEmbeddedSignup = async () => {
    setConnectLoading(true);
    setStatusMessage(null);
    setStatusError(null);
    setDebugOutput(null);

    try {
      const response = await fetch("/api/settings/doctor-whatsapp/meta/start", {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") {
        setConnectLoading(false);
        setStatusError(data.error || "Unable to start Meta Embedded Signup.");
        return;
      }

      window.location.assign(data.url);
    } catch {
      setConnectLoading(false);
      setStatusError("Network error while starting Meta Embedded Signup.");
    }
  };

  const handleSavePhone = async () => {
    setSavingPhone(true);
    setStatusMessage(null);
    setStatusError(null);
    setDebugOutput(null);

    try {
      const response = await fetch("/api/settings/doctor-whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatusError(data.error || data.details || "Failed to save WhatsApp number.");
        return;
      }

      await reloadSettings();
      setStatusMessage("WhatsApp number saved successfully.");
    } catch {
      setStatusError("Network error while saving WhatsApp number.");
    } finally {
      setSavingPhone(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setStatusMessage(null);
    setStatusError(null);
    setDebugOutput(null);

    try {
      const response = await fetch("/api/settings/doctor-whatsapp", {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatusError(data.error || "Failed to disconnect Meta WhatsApp.");
        return;
      }

      await reloadSettings();
      setStatusMessage("Meta WhatsApp disconnected for this doctor account.");
    } catch {
      setStatusError("Network error while disconnecting Meta WhatsApp.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendTestWhatsapp = async () => {
    setTestSending(true);
    setStatusMessage(null);
    setStatusError(null);
    setDebugOutput(null);

    try {
      const response = await fetch("/api/whatsapp/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatusError(data.details || data.error || "Failed to send test WhatsApp.");
        if (data.debug) {
          setDebugOutput(JSON.stringify(data.debug, null, 2));
        }
        return;
      }

      setStatusMessage(data.message || "Test WhatsApp sent successfully.");
      if (data.debug) {
        setDebugOutput(JSON.stringify(data.debug, null, 2));
      }
    } catch {
      setStatusError("Network error while sending test WhatsApp.");
    } finally {
      setTestSending(false);
    }
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
      <section className="w-full max-w-2xl rounded-[2rem] border border-slate-200/80 bg-white/95 p-8 shadow-xl shadow-slate-900/10">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">
            WhatsApp Integration
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Connect Your WhatsApp</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Connect using Meta WhatsApp Business Embedded Signup. No manual token or ID copy is required.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="mb-2 text-xs text-slate-500">
            Logged in as: <span className="font-semibold text-slate-700">{currentUserLabel || "Unknown user"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-slate-700">Status</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {connected ? "Connected" : "Not connected"}
            </span>
          </div>
          {connectedAt ? (
            <p className="mt-2 text-xs text-slate-500">Connected at: {new Date(connectedAt).toLocaleString()}</p>
          ) : null}
          {savedBusinessAccountIdMasked ? (
            <p className="mt-2 text-xs text-slate-500">Saved WABA ID: {savedBusinessAccountIdMasked}</p>
          ) : null}
          {savedPhoneNumberIdMasked ? (
            <p className="mt-2 text-xs text-slate-500">Saved Phone Number ID: {savedPhoneNumberIdMasked}</p>
          ) : null}
        </div>

        {metaConfig?.error ? (
          <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{metaConfig.error}</p>
        ) : null}

        <div className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          <p><span className="font-semibold text-slate-900">Step 1</span> Click Connect with Meta below.</p>
          <p><span className="font-semibold text-slate-900">Step 2</span> Log in to Facebook and complete Embedded Signup.</p>
          <p><span className="font-semibold text-slate-900">Step 3</span> We auto-save your WhatsApp credentials after verification.</p>
        </div>

        <div className="mt-8 grid gap-5">
          <label className="block text-sm font-medium text-slate-700">
            Your WhatsApp Number
            <input
              type="text"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              placeholder="e.g. 077XXXXXXXX"
            />
          </label>
        </div>

        {statusMessage ? (
          <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{statusMessage}</p>
        ) : null}
        {statusError ? (
          <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{statusError}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleSavePhone}
            disabled={savingPhone || !phone.trim()}
            className="flex-1 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-50"
          >
            {savingPhone ? "Saving..." : "Save Number"}
          </button>
          <button
            type="button"
            onClick={handleStartHostedEmbeddedSignup}
            disabled={connectLoading || !metaConfig?.configId}
            className="flex-1 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-50"
          >
            {connectLoading ? "Connecting..." : "Connect with Meta"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleStartEmbeddedSignup}
          disabled={connectLoading || !sdkReady || !metaConfig?.configId}
          className="mt-3 w-full rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-50"
        >
          Continue with Meta popup
        </button>

        <div className="mt-3">
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting || !connected}
            className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect Meta WhatsApp"}
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Send Template Test</h2>
          <p className="mt-2 text-sm text-slate-600">
            Send one manual appointment_reminder template message from your Meta test number to an authorized recipient.
          </p>

          <div className="mt-4 grid gap-4">
            <label className="block text-sm font-medium text-slate-700">
              Test Recipient Number
              <input
                type="text"
                value={testPhone}
                onChange={(event) => setTestPhone(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                placeholder="e.g. 077XXXXXXXX"
              />
            </label>

            <button
              type="button"
              onClick={handleSendTestWhatsapp}
              disabled={testSending || !testPhone.trim() || !connected}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {testSending ? "Sending template test..." : "Send appointment_reminder Test"}
            </button>
          </div>

          {debugOutput ? (
            <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
              {debugOutput}
            </pre>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.assign("/");
            } else {
              router.replace("/");
            }
          }}
          className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Continue to Dashboard
        </button>
      </section>
    </main>
  );
}
