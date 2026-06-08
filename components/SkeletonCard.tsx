export function SkeletonCard() {
  return (
    <div
      className="bg-primary rounded-2xl p-5 shadow-card-accent flex flex-col gap-3 overflow-visible"
      style={{ border: '1px solid rgb(var(--rgb-secondary) / 0.12)' }}
      aria-hidden="true"
    >
      {/* Top: company + status placeholder */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 rounded-md shimmer-bg animate-shimmer" />
          <div className="h-3 w-1/3 rounded-md shimmer-bg animate-shimmer" />
        </div>
        <div className="h-5 w-20 rounded-full shimmer-bg animate-shimmer" />
      </div>

      {/* Role + CTC placeholder */}
      <div className="space-y-2">
        <div className="h-4 w-1/2 rounded-md shimmer-bg animate-shimmer" />
        <div className="h-3 w-1/4 rounded-md shimmer-bg animate-shimmer" />
      </div>

      {/* Role-type chip + location */}
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full shimmer-bg animate-shimmer" />
        <div className="h-4 w-20 rounded-md shimmer-bg animate-shimmer" />
      </div>

      {/* Dark teal footer with shimmer pills */}
      <div className="flex items-center justify-between gap-2 mt-auto -mx-5 -mb-5 px-5 py-3 bg-footer rounded-b-2xl">
        <div className="flex flex-col gap-1.5">
          <div
            className="h-3 w-24 rounded-md animate-shimmer"
            style={{
              background:
                'linear-gradient(90deg, rgb(var(--rgb-primary) / 0.08) 0%, rgb(var(--rgb-primary) / 0.18) 50%, rgb(var(--rgb-primary) / 0.08) 100%)',
              backgroundSize: '200% 100%',
            }}
          />
          <div
            className="h-3 w-32 rounded-md animate-shimmer"
            style={{
              background:
                'linear-gradient(90deg, rgb(var(--rgb-primary) / 0.08) 0%, rgb(var(--rgb-primary) / 0.18) 50%, rgb(var(--rgb-primary) / 0.08) 100%)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
        <div className="flex gap-1.5">
          <div
            className="h-6 w-12 rounded-full animate-shimmer"
            style={{
              background:
                'linear-gradient(90deg, rgba(255,200,87,0.5) 0%, rgba(255,200,87,0.8) 50%, rgba(255,200,87,0.5) 100%)',
              backgroundSize: '200% 100%',
            }}
          />
          <div
            className="h-6 w-16 rounded-full animate-shimmer"
            style={{
              background:
                'linear-gradient(90deg, rgba(255,200,87,0.5) 0%, rgba(255,200,87,0.8) 50%, rgba(255,200,87,0.5) 100%)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </div>
    </div>
  );
}
