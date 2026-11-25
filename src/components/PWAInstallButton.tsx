import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'sidebar' | 'header';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'sidebar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  const label = isInstallable ? 'Install app' : 'Install on phone';

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center gap-3 text-sm font-medium text-[var(--emerald)] bg-[var(--emerald-soft)] hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          {isInstallable ? (
            <Download className="w-4 h-4 shrink-0" />
          ) : (
            <Smartphone className="w-4 h-4 shrink-0" />
          )}
          <span>{label}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          aria-label={label}
          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-[var(--emerald)]/40 bg-[var(--emerald-soft)] text-[var(--emerald)] hover:opacity-90 transition-opacity shrink-0"
        >
          {isInstallable ? (
            <Download className="w-4 h-4" />
          ) : (
            <Smartphone className="w-4 h-4" />
          )}
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="install-guide-title" className="font-display text-xl font-semibold">
                  Install Human OS
                </h2>
                <p className="text-xs text-[var(--ink-muted)] mt-1">
                  Works offline on your phone like a native app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-2 text-sm text-[var(--ink)] leading-relaxed">
                <p className="font-medium">On iPhone or iPad (Safari):</p>
                <ol className="list-decimal pl-5 space-y-1.5 text-[var(--ink-muted)]">
                  <li>
                    Tap the <strong className="text-[var(--ink)]">Share</strong> button in Safari.
                  </li>
                  <li>
                    Scroll down and tap{' '}
                    <strong className="text-[var(--ink)]">Add to Home Screen</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-[var(--ink)]">Add</strong> to launch full-screen
                    offline.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-4 text-sm leading-relaxed">
                <div className="space-y-1.5">
                  <p className="font-medium text-[var(--ink)]">
                    Install directly on Android (Chrome / Edge):
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-[var(--ink-muted)]">
                    <li>Open the shared app link directly in Chrome on your Android phone.</li>
                    <li>
                      Tap the browser menu (<strong className="text-[var(--ink)]">⋮</strong>) and
                      select <strong className="text-[var(--ink)]">Install app</strong> or{' '}
                      <strong className="text-[var(--ink)]">Add to Home screen</strong>.
                    </li>
                  </ol>
                </div>

                <div className="pt-3 border-t border-[var(--line)] space-y-1.5">
                  <p className="font-medium text-[var(--ink)]">Generate a standalone .apk file:</p>
                  <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                    Human OS includes full PWA manifest &amp; icons (ready for{' '}
                    <strong className="text-[var(--ink)]">PWABuilder</strong>) plus{' '}
                    <span className="font-mono">capacitor.config.ts</span> and{' '}
                    <span className="font-mono">ANDROID_BUILD.md</span> to build an offline{' '}
                    <span className="font-mono">.apk</span> via Android Studio.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[42px] rounded-xl bg-[var(--emerald)] text-white dark:text-[#06150f] text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
