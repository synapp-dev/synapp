export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-[min(85dvh,52rem)] w-full flex-col items-center justify-center py-16"
    >
      <span className="sr-only">Loading dashboard</span>
      <div className="animate-pulse">
        <img
          src="/images/supersolt-logo-black.svg"
          alt=""
          className="h-16 w-auto max-w-[min(72vw,13rem)] dark:hidden animate-slide-down-fade-in-slowest"
        />
        <img
          src="/images/supersolt-logo-white.svg"
          alt=""
          className="hidden h-16 w-auto max-w-[min(72vw,13rem)] dark:block animate-slide-down-fade-in-slowest"
        />
      </div>
    </div>
  );
}
