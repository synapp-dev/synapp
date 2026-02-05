import Image from "next/image";

export default function MaintenancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <Image
        src="/images/bp-man/bp-man-wrench.svg"
        alt=""
        width={500}
        height={500}
        className="animate-bounce-gentle -mb-6"
      />
      <h1 className="text-2xl font-semibold mb-2">Bullyproof is currently under maintenance!</h1>
      <p className="text-muted-foreground max-w-md">
          We're working hard on upgrades to the platform. Please check back later!
      </p>
    </div>
  );
}
