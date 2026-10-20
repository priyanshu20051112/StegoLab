import { AlertTriangle, AudioWaveform, CheckCircle2, FileText, Image, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Medium, StatsResult } from "@/types";

export interface StatsStripProps {
  stats: StatsResult | null;
  loading: boolean;
  /** When true the strip hides itself silently (never breaks the page). */
  error?: boolean;
}

const MEDIUM_META: {
  id: Medium;
  label: string;
  icon: typeof Image;
  tone: string;
}[] = [
  { id: "image", label: "Image", icon: Image, tone: "text-emerald-500 bg-emerald-500/10" },
  { id: "audio", label: "Audio", icon: AudioWaveform, tone: "text-cyan-500 bg-cyan-500/10" },
  { id: "text", label: "Text", icon: FileText, tone: "text-violet-500 bg-violet-500/10" },
];

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur transition-colors hover:border-primary/30">
      <div className="flex items-center gap-2.5">
        {tone && (
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}>
            {icon}
          </span>
        )}
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function StatsStrip({ stats, loading, error = false }: StatsStripProps) {
  // Hide silently on error — the page must keep working without stats.
  if (error) return null;
  if (loading || !stats) {
    return (
      <section aria-label="Loading statistics" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-16 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="StegoLab usage statistics"
      className="space-y-4 animate-fade-in"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total encoded"
          value={stats.encoded}
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          tone="text-success bg-success/10"
        />
        <StatCard
          label="Total decoded"
          value={stats.decoded}
          icon={<Lock className="h-4 w-4" aria-hidden="true" />}
          tone="text-info bg-info/10"
        />
        <StatCard
          label="Failed operations"
          value={stats.failed}
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          tone={stats.failed > 0 ? "text-warning bg-warning/10" : "text-muted-foreground bg-muted"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {MEDIUM_META.map(({ id, label, icon: Icon, tone }) => {
          const mediumStats = stats.by_medium?.[id];
          return (
            <div
              key={id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/60 px-4 py-3 backdrop-blur"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {label}
              </span>
              <span className="flex items-center gap-3 font-mono text-xs tabular-nums text-muted-foreground">
                <span title={`${label} encoded`}>
                  <span className="sr-only">{label} encoded: </span>
                  ↑{mediumStats?.encoded ?? 0}
                </span>
                <span title={`${label} decoded`}>
                  <span className="sr-only">{label} decoded: </span>
                  ↓{mediumStats?.decoded ?? 0}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
