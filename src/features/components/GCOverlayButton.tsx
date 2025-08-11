// src/features/components/GCOverlayButton.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

type VmixTarget = "vmix1" | "vmix2";

type VmixConfig = {
  ip1: string;
  ip2: string;
  presets?: {
    gcLotes?: {
      target: VmixTarget;
      input: string;
      overlay: 1 | 2 | 3 | 4;
    };
  };
};

function storageKey(eventoId: number) {
  return `vmixConfig:evento:${eventoId}`;
}
function loadConfig(eventoId: number): VmixConfig {
  try {
    const raw = localStorage.getItem(storageKey(eventoId));
    if (!raw) return { ip1: "", ip2: "" };
    const j = JSON.parse(raw);
    return { ip1: j.ip1 ?? "", ip2: j.ip2 ?? "", presets: j.presets ?? {} };
  } catch {
    return { ip1: "", ip2: "" };
  }
}
function isValidIPv4(ip: string) {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  return m.slice(1).every((oct) => {
    const n = Number(oct);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

type Props = {
  eventoId: number;
  /** Opcional: sobrescreve o preset */
  targetVmixOverride?: VmixTarget;
  /** Opcional: sobrescreve o preset */
  overlayOverride?: 1 | 2 | 3 | 4;
  /** Opcional: sobrescreve o preset */
  vmixInputOverride?: string;
  labelOff?: string;
  labelOn?: string;
  className?: string;
};

export default function GCOverlayButton({
  eventoId,
  targetVmixOverride,
  overlayOverride,
  vmixInputOverride,
  labelOff = "GC LOTE OFF",
  labelOn = "GC LOTE ON",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [on, setOn] = useState<boolean>(false);

  // carrega status inicial do banco
  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch(`/eventos/${eventoId}/gc-lotes/status`);
        const j = await r.json();
        setOn(!!j.on);
      } catch {
        setOn(false);
      }
    })();
  }, [eventoId]);

  async function handleToggle() {
    if (loading) return;
    setLoading(true);

    try {
      const cfg = loadConfig(eventoId);
      const preset = cfg.presets?.gcLotes;

      const target: VmixTarget =
        targetVmixOverride ?? preset?.target ?? "vmix1";
      const ip =
        target === "vmix1" ? (cfg.ip1 || "").trim() : (cfg.ip2 || "").trim();

      if (!ip || !isValidIPv4(ip)) {
        toast.error("IP do vMix inválido. Configure em Configurações > vMix.");
        setLoading(false);
        return;
      }

      const overlay: 1 | 2 | 3 | 4 = overlayOverride ?? preset?.overlay ?? 1;

      const input = (vmixInputOverride ?? preset?.input ?? "1")
        .toString()
        .trim();

      if (!input) {
        toast.error(
          "Preset do GC LOTES sem input. Configure nas Configurações."
        );
        setLoading(false);
        return;
      }

      if (!on) {
        // estava OFF -> liga overlay e marca ON
        await apiFetch(`/vmix/overlay/on`, {
          method: "POST",
          body: JSON.stringify({ ip, overlay, input }),
        });
        await apiFetch(`/eventos/${eventoId}/gc-lotes/on`, { method: "POST" });
        setOn(true);
        toast.success("GC LOTE ON");
      } else {
        // estava ON -> desliga overlay e marca OFF
        await apiFetch(`/vmix/overlay/off`, {
          method: "POST",
          body: JSON.stringify({ ip, overlay }),
        });
        await apiFetch(`/eventos/${eventoId}/gc-lotes/off`, { method: "POST" });
        setOn(false);
        toast.success("GC LOTE OFF");
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha ao acionar vMix/atualizar status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={loading}
      variant={on ? "default" : "outline"}
      className={className}
    >
      {on ? labelOn : labelOff}
    </Button>
  );
}
