/** The looping Jourdain orb video. Used large on the welcome screen and small as
 *  the assistant avatar beside chat messages. Size/shape via className. */
export function JourdainOrb({ className }: { className?: string }) {
  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      className={className}
    >
      <source src="/videos/jourdain-orb-loop.webm" type="video/webm" />
      <source src="/videos/jourdain-orb-loop.mp4" type="video/mp4" />
    </video>
  );
}
