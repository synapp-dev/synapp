import { GymHeader } from "@/components/organisms/gym-header";

export default function GymLayout({ children }: { children: React.ReactNode }) {
  return <GymHeader>{children}</GymHeader>;
}
