import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWA';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-display font-bold transition-colors whitespace-nowrap cursor-pointer"
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#101326]/90 border border-emerald-400/35 text-xs font-medium text-emerald-300 hover:border-emerald-300 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
          <span>Install App</span>
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#080a18]/80 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#12162e] border border-indigo-400/30 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  Install on iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="Close install guide"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside">
                <li>
                  Tap the <strong className="text-white">Share</strong> icon in
                  Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and tap{' '}
                  <strong className="text-white">Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong className="text-white">Add</strong> to launch
                  Spacecraft Shooting as a standalone app.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-display font-bold text-xs cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#101326]/90 border border-indigo-400/20 text-xs font-medium text-emerald-300 hover:border-emerald-400/50 transition-colors whitespace-nowrap cursor-pointer"
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#080a18]/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#12162e] border border-indigo-400/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">
                Install Desktop / Mobile App
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Open this app directly in Chrome, Edge, or Safari (outside an
              embedded preview frame) and click the browser address bar{' '}
              <strong className="text-white">Install</strong> icon or{' '}
              <strong className="text-white">Add to Home Screen</strong> to
              run Spacecraft Shooting as a standalone app with offline Solo,
              Local 2P, and Survival modes.
            </p>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-display font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#141830]/95 border border-amber-400/45 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-lg">
      <WifiOff className="w-3.5 h-3.5 text-amber-300 shrink-0" />
      <span>Offline Mode · Solo, Local 2P &amp; Survival ready</span>
    </div>
  );
};
