import { Companion, type CompanionPose } from "@/components/reading/Companion";

/** Buddy beside a heading: waves when the screen opens and answers a hover or a tap. */
export function CompanionPerchless({
  pose,
  className = "",
}: {
  pose: CompanionPose;
  className?: string;
}) {
  return <Companion pose={pose} interactive animate={pose === "wave"} className={className} />;
}
