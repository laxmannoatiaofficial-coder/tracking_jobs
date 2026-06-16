'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Self-contained animated desk scene for the login page's framed panel.
 * Zero props. One 900×506 (16:9) illustrated world; all camera movement is
 * a single CSS transform on the scene container. A fit-scaler keeps the
 * scene matched to the panel's actual rendered size. Loops indefinitely.
 *
 *   1. Phone ringing (accept = skip)            0–4s
 *   2. Pull back — recruiter speaks (floating
 *      typewriter callout)                      4–8.5s
 *   3. Face the person — panic pills + CTA      8.5–14s
 *   4. Laptop screen lights up — form clone +
 *      tagline reveal                          14–19s
 *   5. Hold, fade, loop                        19–22.5s
 */

type StoryStep = 1 | 2 | 3 | 4 | 5;

interface CameraState {
  scale: number;
  translateX: number;
  translateY: number;
  duration: number;
}

// Spec values fine-tuned so each shot actually centers its subject
// in the 900×506 scene space.
const CAMERA: Record<StoryStep, CameraState> = {
  1: { scale: 2.6, translateX: -134, translateY: -31, duration: 0 },
  2: { scale: 1.45, translateX: 30, translateY: 15, duration: 1000 },
  3: { scale: 1.5, translateX: 90, translateY: -57, duration: 1000 },
  4: { scale: 2.8, translateX: 40, translateY: 23, duration: 1200 },
  5: { scale: 2.8, translateX: 40, translateY: 23, duration: 0 },
};

const STEP_DURATIONS: Record<StoryStep, number> = {
  1: 4000,
  2: 4500,
  3: 5500,
  4: 5000,
  5: 3500,
};

const PITCH =
  'Hi! This is Priya from Razorpay. You applied for a PM role last week — do you have a minute?';

const THOUGHTS: { text: string; top: number; left: number }[] = [
  { text: 'Wait... Razorpay?', top: 220, left: 270 },
  { text: 'Which role was this again?', top: 185, left: 248 },
  { text: 'When did I even apply?!', top: 150, left: 262 },
];

export function LoginStoryPanel() {
  const [step, setStep] = useState<StoryStep>(1);
  const [sceneVisible, setSceneVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [typedCount, setTypedCount] = useState(0);
  const [headTilt, setHeadTilt] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fit, setFit] = useState(1);
  const frameRef = useRef<HTMLDivElement>(null);

  // Fit the fixed 900×506 scene to the panel's rendered size.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setFit(el.clientWidth / 900);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setMounted(true);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true);
    }
  }, []);

  // Step auto-advance + hold/fade/reset loop.
  useEffect(() => {
    if (reducedMotion) return;
    if (step === 5) {
      const fade = setTimeout(() => setSceneVisible(false), STEP_DURATIONS[5]);
      const reset = setTimeout(() => {
        setStep(1);
        setTypedCount(0);
        setHeadTilt(false);
        setSceneVisible(true);
      }, STEP_DURATIONS[5] + 700 + 500);
      return () => {
        clearTimeout(fade);
        clearTimeout(reset);
      };
    }
    const timer = setTimeout(
      () => setStep((s) => (s + 1) as StoryStep),
      STEP_DURATIONS[step],
    );
    return () => clearTimeout(timer);
  }, [step, reducedMotion]);

  // Typewriter (38ms/char) for the recruiter's floating callout.
  useEffect(() => {
    if (reducedMotion || step !== 2) return;
    const interval = setInterval(() => {
      setTypedCount((c) => {
        if (c >= PITCH.length) {
          clearInterval(interval);
          setHeadTilt(true);
          return c;
        }
        return c + 1;
      });
    }, 38);
    return () => clearInterval(interval);
  }, [step, reducedMotion]);

  const cam = CAMERA[step];
  const typingDone = typedCount >= PITCH.length;
  const blur = (isPhone: boolean) =>
    step === 1 && !isPhone ? 'blur(1.5px)' : 'blur(0px)';

  return (
    <div
      ref={frameRef}
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        aspectRatio: '16 / 9',
        background: '#1e2d2d',
        border: '2px solid rgba(255, 200, 87, 0.25)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
      }}
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes lsp-ring-pulse {
            0%   { transform: scale(1);   opacity: 0.6; }
            100% { transform: scale(2.4); opacity: 0;   }
          }
          @keyframes lsp-bob {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50%      { transform: translateX(-50%) translateY(-4px); }
          }
          @keyframes lsp-blink {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0; }
          }
        }
      `}</style>

      {/* Fit-scaler: keeps the 900×506 world matched to the frame size */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: 900,
          height: 506,
          marginLeft: -450,
          marginTop: -253,
          transform: `scale(${fit})`,
          transformOrigin: 'center center',
          opacity: sceneVisible && mounted ? 1 : 0,
          transition: `opacity ${sceneVisible ? 600 : 700}ms ease`,
        }}
      >
        {/* Camera */}
        <div
          style={{
            width: 900,
            height: 506,
            position: 'relative',
            transformOrigin: 'center center',
            transform: `scale(${cam.scale}) translate(${cam.translateX}px, ${cam.translateY}px)`,
            transition:
              reducedMotion || cam.duration === 0
                ? 'none'
                : `transform ${cam.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        >
          {/* Desk surface with faint wood grain */}
          <div
            className="absolute inset-0"
            style={{ background: '#3D4F4F', overflow: 'hidden' }}
          >
            {[90, 210, 330, 440].map((y) => (
              <div
                key={y}
                style={{
                  position: 'absolute',
                  left: -80,
                  top: y,
                  width: 1100,
                  height: 1.5,
                  background: 'rgba(255,255,255,0.03)',
                  transform: 'rotate(-2deg)',
                }}
              />
            ))}
          </div>

          {/* Lamp */}
          <div
            className="absolute"
            style={{ left: 60, top: 40, filter: blur(false), transition: 'filter 800ms ease' }}
          >
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 160,
                height: 160,
                left: -48,
                top: -24,
                background:
                  'radial-gradient(circle, rgba(255,200,87,0.12) 0%, transparent 70%)',
              }}
            />
            <div
              style={{
                width: 64,
                height: 38,
                background: 'rgba(255, 200, 87, 0.65)',
                clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)',
              }}
            />
            <div className="mx-auto" style={{ width: 4, height: 44, background: '#2D3A3A' }} />
            <div
              className="mx-auto rounded-full"
              style={{ width: 28, height: 28, background: '#2D3A3A', marginTop: -3 }}
            />
          </div>

          {/* Books */}
          <div
            className="absolute"
            style={{ left: 120, top: 210, filter: blur(false), transition: 'filter 800ms ease' }}
          >
            <div style={{ width: 74, height: 11, background: '#3D4F4F', borderRadius: 2, marginLeft: 6, border: '1px solid rgba(255,255,255,0.05)' }} />
            <div style={{ width: 80, height: 13, background: '#4a6060', borderRadius: 2, marginLeft: 3 }} />
            <div style={{ width: 88, height: 16, background: '#FFC857', borderRadius: 2 }} />
          </div>

          {/* Laptop */}
          <div
            className="absolute"
            style={{ left: 300, top: 180, filter: blur(false), transition: 'filter 800ms ease' }}
          >
            <div
              className="relative"
              style={{ width: 220, height: 155, borderRadius: 10, background: '#2D3A3A' }}
            >
              {/* Bezel */}
              <div
                className="absolute"
                style={{ inset: 12, borderRadius: 6, background: '#1a2626' }}
              >
                {/* Screen */}
                <div
                  className="absolute"
                  style={{
                    inset: 4,
                    borderRadius: 4,
                    background:
                      step >= 4 ? 'rgba(244,246,248,0.92)' : '#0f1a1a',
                    boxShadow:
                      step >= 4 ? '0 0 50px rgba(244,246,248,0.12)' : 'none',
                    transition: 'background 600ms ease, box-shadow 600ms ease',
                  }}
                />
              </div>
              {/* Apple-ish logo on the lid back */}
              <svg
                className="absolute"
                style={{ right: 18, top: 18, opacity: 0.3 }}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <circle cx="6" cy="6" r="5" fill="#1a2626" />
                <circle cx="10" cy="3.5" r="2.4" fill="#2D3A3A" />
              </svg>
            </div>
            <div
              style={{
                width: 220,
                height: 22,
                background: '#252f2f',
                borderRadius: '0 0 10px 10px',
              }}
            />
          </div>

          {/* Login form clone — on the laptop screen (step 4) */}
          <div
            id="login-form-clone"
            aria-hidden="true"
            className="absolute flex items-center justify-center pointer-events-none"
            style={{
              left: 316,
              top: 196,
              width: 188,
              height: 123,
              opacity: step >= 4 ? 1 : 0,
              transition:
                step >= 4 ? 'opacity 550ms ease-out 1200ms' : 'opacity 200ms ease',
            }}
          >
            <div
              style={{
                width: 240,
                transform: step >= 4 ? 'scale(0.68)' : 'scale(0.2)',
                transition:
                  step >= 4
                    ? 'transform 550ms ease-out 1200ms'
                    : 'transform 200ms ease',
                background: '#F4F6F8',
                borderRadius: 16,
                boxShadow: '0 4px 20px rgba(45,58,58,0.3)',
                padding: 16,
              }}
            >
              <p className="font-display font-bold" style={{ fontSize: 10, color: '#2D3A3A' }}>
                Trackitt
              </p>
              <p className="font-display font-bold" style={{ fontSize: 8, color: '#2D3A3A', marginTop: 2 }}>
                Welcome back
              </p>
              <div
                className="flex items-center justify-center"
                style={{
                  marginTop: 6,
                  height: 16,
                  borderRadius: 999,
                  background: '#FFFFFF',
                  border: '1px solid rgba(45,58,58,0.18)',
                  fontSize: 6.5,
                  color: '#2D3A3A',
                }}
              >
                Continue with Google
              </div>
              <div className="flex items-center" style={{ gap: 5, margin: '5px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(45,58,58,0.1)' }} />
                <span style={{ fontSize: 5, color: 'rgba(45,58,58,0.35)' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(45,58,58,0.1)' }} />
              </div>
              <div style={{ height: 13, borderRadius: 8, background: 'rgba(45,58,58,0.06)', border: '1px solid rgba(45,58,58,0.15)' }} />
              <div style={{ height: 13, borderRadius: 8, background: 'rgba(45,58,58,0.06)', border: '1px solid rgba(45,58,58,0.15)', marginTop: 5 }} />
              <div
                className="flex items-center justify-center font-semibold"
                style={{
                  marginTop: 6,
                  height: 15,
                  borderRadius: 999,
                  background: '#FFC857',
                  fontSize: 7,
                  color: '#2D3A3A',
                }}
              >
                Sign in
              </div>
              <p style={{ fontSize: 5, color: 'rgba(45,58,58,0.5)', textAlign: 'center', marginTop: 4 }}>
                Don&rsquo;t have an account?{' '}
                <span style={{ color: '#d99e2b', fontWeight: 600 }}>Get Started</span>
              </p>
            </div>
          </div>

          {/* Tagline above the laptop (step 4) */}
          <div
            className="absolute text-center"
            style={{
              left: 410,
              top: 138,
              transform: 'translateX(-50%)',
              opacity: step >= 4 ? 1 : 0,
              transition:
                step >= 4 ? 'opacity 500ms ease 2250ms' : 'opacity 200ms ease',
            }}
          >
            <p
              className="font-display font-bold text-primary"
              style={{ fontSize: 16, lineHeight: 1.2, whiteSpace: 'nowrap' }}
            >
              Never get caught off guard again.
            </p>
            <div
              className="mx-auto"
              style={{
                height: 3,
                background: '#FFC857',
                borderRadius: 2,
                marginTop: 4,
                width: step >= 4 ? 38 : 0,
                transition:
                  step >= 4 ? 'width 400ms ease 2750ms' : 'width 200ms ease',
              }}
            />
            <p
              className="mx-auto"
              style={{
                fontSize: 9,
                maxWidth: 220,
                marginTop: 5,
                color: 'rgb(244 246 248 / 0.65)',
                opacity: step >= 4 ? 1 : 0,
                transition:
                  step >= 4 ? 'opacity 500ms ease 3450ms' : 'opacity 200ms ease',
              }}
            >
              Know exactly who&rsquo;s calling, what you applied for, and when
              to follow up.
            </p>
          </div>

          {/* Phone */}
          <div
            className="absolute"
            style={{
              left: 550,
              top: 220,
              transform: 'rotate(-8deg)',
              opacity: step >= 4 ? 0.25 : 1,
              transition: 'opacity 400ms ease',
            }}
          >
            {step === 1 &&
              !reducedMotion &&
              [0, 0.7, 1.4].map((delay) => (
                <div
                  key={delay}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 150,
                    height: 150,
                    left: -41,
                    top: -11,
                    border: '2px solid rgba(255,200,87,0.15)',
                    animation: `lsp-ring-pulse 2.2s ease-out ${delay}s infinite`,
                  }}
                />
              ))}

            <div
              className="relative"
              style={{
                width: 68,
                height: 128,
                borderRadius: 16,
                background: '#1a2424',
                border: '1.5px solid rgba(255,255,255,0.07)',
                boxShadow:
                  step === 1 ? '0 0 20px rgba(255,200,87,0.15)' : 'none',
                transition: 'box-shadow 600ms ease',
              }}
            >
              <div
                className="absolute flex flex-col items-center"
                style={{
                  inset: 6,
                  borderRadius: 11,
                  background: '#0f1c1c',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 5,
                    borderRadius: 999,
                    background: '#0a1313',
                    marginTop: 2,
                  }}
                />
                <div
                  className="flex items-center justify-center font-display font-bold"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    marginTop: 6,
                    background: 'rgba(255,200,87,0.18)',
                    border: '1px solid rgba(255,200,87,0.3)',
                    fontSize: 8,
                    color: '#FFC857',
                  }}
                >
                  PS
                </div>
                <p
                  className="font-display font-bold text-primary"
                  style={{ fontSize: 7.5, marginTop: 3 }}
                >
                  Priya Sharma
                </p>
                <p style={{ fontSize: 5.5, color: 'rgb(244 246 248 / 0.55)' }}>
                  Razorpay · Recruiter
                </p>

                <div
                  className="flex items-start justify-center"
                  style={{
                    gap: 11,
                    marginTop: 'auto',
                    marginBottom: 5,
                    opacity: step === 1 ? 1 : 0,
                    transition: 'opacity 300ms ease',
                    pointerEvents: step === 1 ? 'auto' : 'none',
                  }}
                >
                  <div className="flex flex-col items-center" style={{ gap: 2 }}>
                    <span
                      className="flex items-center justify-center rounded-full"
                      style={{ width: 15, height: 15, background: '#EF4444' }}
                    >
                      <MiniHandset down />
                    </span>
                    <span style={{ fontSize: 4, color: 'rgb(244 246 248 / 0.45)' }}>
                      DECLINE
                    </span>
                  </div>
                  <div className="flex flex-col items-center" style={{ gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => step === 1 && setStep(2)}
                      aria-label="Accept call"
                      className="flex items-center justify-center rounded-full cursor-pointer"
                      style={{ width: 15, height: 15, background: '#22C55E' }}
                    >
                      <MiniHandset />
                    </button>
                    <span style={{ fontSize: 4, color: 'rgb(244 246 248 / 0.45)' }}>
                      ACCEPT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating recruiter callout — upper-right of the phone (step 2) */}
          <div
            className="absolute"
            style={{
              left: 632,
              top: 128,
              maxWidth: 160,
              borderRadius: 16,
              padding: '10px 14px',
              background: 'rgba(244,246,248,0.93)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              opacity: step === 2 ? 1 : 0,
              transition:
                step === 2
                  ? 'opacity 350ms ease 900ms'
                  : 'opacity 400ms ease',
            }}
          >
            <p style={{ fontSize: 10, lineHeight: 1.5, color: '#2D3A3A' }}>
              {step >= 2 ? PITCH.slice(0, typedCount) : ''}
              {step === 2 && !typingDone && (
                <span style={{ animation: 'lsp-blink 0.8s step-end infinite' }}>
                  |
                </span>
              )}
            </p>
            <div
              style={{
                position: 'absolute',
                left: 14,
                bottom: -7,
                width: 0,
                height: 0,
                borderLeft: '7px solid transparent',
                borderRight: '7px solid transparent',
                borderTop: '8px solid rgba(244,246,248,0.93)',
              }}
            />
          </div>

          {/* Person — top-down (steps 1–2) */}
          <div
            id="person-topdown"
            className="absolute"
            style={{
              left: 350,
              top: 400,
              opacity: step <= 2 ? 1 : 0,
              filter: blur(false),
              transition: 'opacity 500ms ease 300ms, filter 800ms ease',
            }}
          >
            <div
              className="relative mx-auto"
              style={{
                width: 58,
                height: 58,
                transform: headTilt && step === 2 ? 'rotate(4deg)' : 'rotate(0deg)',
                transition: 'transform 600ms ease',
              }}
            >
              <div className="absolute inset-0 rounded-full" style={{ background: '#C8956C' }} />
              <div className="absolute overflow-hidden" style={{ inset: -2, borderRadius: '50%' }}>
                <div
                  style={{
                    width: '100%',
                    height: '46%',
                    background: '#2D3A3A',
                    borderRadius: '50% 50% 36% 36%',
                  }}
                />
              </div>
            </div>
            <div
              style={{
                width: 130,
                height: 38,
                marginTop: -7,
                marginLeft: -36,
                background: 'rgba(255,200,87,0.72)',
                borderRadius: '20px 20px 0 0',
              }}
            />
          </div>

          {/* Person — front-facing, panicked (step 3) */}
          <div
            id="person-front"
            className="absolute"
            style={{
              left: 348,
              top: 330,
              opacity: step === 3 ? 1 : 0,
              transition:
                step === 3 ? 'opacity 500ms ease 500ms' : 'opacity 400ms ease',
            }}
          >
            <div className="relative mx-auto" style={{ width: 74, height: 86 }}>
              <div
                className="absolute inset-0"
                style={{ background: '#C8956C', borderRadius: '50%' }}
              />
              <div
                className="absolute"
                style={{
                  top: -2,
                  left: -4,
                  width: 82,
                  height: 34,
                  background: '#2D3A3A',
                  borderRadius: '40px 40px 0 0',
                }}
              />
              {/* furrowed brows */}
              <div
                className="absolute"
                style={{
                  left: 15,
                  top: 37,
                  width: 15,
                  height: 3,
                  background: '#2D3A3A',
                  borderRadius: 2,
                  transform: 'rotate(12deg)',
                }}
              />
              <div
                className="absolute"
                style={{
                  right: 15,
                  top: 37,
                  width: 15,
                  height: 3,
                  background: '#2D3A3A',
                  borderRadius: 2,
                  transform: 'rotate(-12deg)',
                }}
              />
              {/* wide eyes */}
              <div
                className="absolute rounded-full"
                style={{
                  left: 18,
                  top: 45,
                  width: 9,
                  height: 9,
                  background: '#2D3A3A',
                  transform: 'scale(1.2)',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  right: 18,
                  top: 45,
                  width: 9,
                  height: 9,
                  background: '#2D3A3A',
                  transform: 'scale(1.2)',
                }}
              />
              {/* surprised mouth */}
              <div
                className="absolute"
                style={{
                  left: '50%',
                  bottom: 16,
                  width: 12,
                  height: 7,
                  marginLeft: -6,
                  background: '#2D3A3A',
                  borderRadius: '50%',
                }}
              />
              {/* raised "wait, what?" hand */}
              <div
                className="absolute"
                style={{
                  right: -26,
                  top: 38,
                  width: 8,
                  height: 40,
                  background: '#C8956C',
                  borderRadius: 4,
                  transform: 'rotate(18deg)',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  right: -32,
                  top: 26,
                  width: 20,
                  height: 20,
                  background: '#C8956C',
                }}
              />
            </div>
            <div
              style={{
                width: 150,
                height: 52,
                marginTop: -6,
                marginLeft: -38,
                background: 'rgba(255,200,87,0.72)',
                borderRadius: '24px 24px 0 0',
              }}
            />
          </div>

          {/* Thought pills (step 3) */}
          {THOUGHTS.map((t, i) => (
            <div
              key={t.text}
              className="absolute font-semibold"
              style={{
                left: t.left,
                top: t.top,
                padding: '5px 14px',
                borderRadius: 999,
                background: '#F4F6F8',
                border: '1px solid rgba(45,58,58,0.2)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                fontSize: 10,
                color: '#2D3A3A',
                whiteSpace: 'nowrap',
                opacity: step === 3 ? 1 : 0,
                transform: step === 3 ? 'translateY(0)' : 'translateY(8px)',
                transition:
                  step === 3
                    ? `opacity 300ms ease-out ${1000 + i * 600}ms, transform 300ms ease-out ${1000 + i * 600}ms`
                    : 'opacity 250ms ease, transform 250ms ease',
              }}
            >
              {t.text}
            </div>
          ))}
          {/* Thought connector dots */}
          {[
            { size: 7, left: 362, top: 304 },
            { size: 5, left: 348, top: 286 },
            { size: 3, left: 338, top: 270 },
          ].map((dot, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: dot.size,
                height: dot.size,
                left: dot.left,
                top: dot.top,
                background: '#F4F6F8',
                opacity: step === 3 ? 0.75 : 0,
                transition:
                  step === 3
                    ? `opacity 300ms ease ${850 + i * 150}ms`
                    : 'opacity 250ms ease',
              }}
            />
          ))}

          {/* Floating CTA (step 3) */}
          <div
            className="absolute"
            style={{
              left: '50%',
              bottom: 40,
              opacity: step === 3 ? 1 : 0,
              transition:
                step === 3 ? 'opacity 300ms ease 3400ms' : 'opacity 250ms ease',
              pointerEvents: step === 3 ? 'auto' : 'none',
              transform: 'translateX(-50%)',
              animation:
                step === 3 && !reducedMotion
                  ? 'lsp-bob 2s ease-in-out infinite'
                  : undefined,
            }}
          >
            <button
              type="button"
              onClick={() => step === 3 && setStep(4)}
              className="font-semibold cursor-pointer"
              style={{
                background: '#FFC857',
                color: '#2D3A3A',
                fontSize: 10,
                borderRadius: 999,
                padding: '7px 18px',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(255,200,87,0.35)',
              }}
            >
              Know more about the job you applied for? →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniHandset({ down = false }: { down?: boolean }) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={down ? { transform: 'rotate(135deg)' } : undefined}
    >
      <path
        d="M5.5 3.5c.8-.8 2-.8 2.7 0l1.2 1.3c.7.7.7 1.8 0 2.5l-.6.7c.4 1 1.1 2 2 2.9.9.9 1.9 1.6 2.9 2l.7-.6c.7-.7 1.8-.7 2.5 0l1.3 1.2c.8.7.8 1.9 0 2.7l-.9.9c-.7.7-1.8 1-2.8.6-2.4-.8-4.7-2.3-6.7-4.3s-3.5-4.3-4.3-6.7c-.4-1-.1-2.1.6-2.8l1.4-1.4z"
        fill="#F4F6F8"
      />
    </svg>
  );
}
