// src/features/eventos/components/ConfigEventoTab.tsx
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type Props = { eventoId: number };
type VmixTarget = "vmix1" | "vmix2";

type VmixConfig = {
  ip1: string;
  ip2: string;
  presets?: {
    gcLotes?: {
      target: VmixTarget;
      input: string;
      overlay: number;
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
    return {
      ip1: j.ip1 ?? "",
      ip2: j.ip2 ?? "",
      presets: j.presets ?? {},
    };
  } catch {
    return { ip1: "", ip2: "" };
  }
}
function saveConfig(eventoId: number, cfg: VmixConfig) {
  localStorage.setItem(storageKey(eventoId), JSON.stringify(cfg));
}
function isValidIPv4(ip: string) {
  if (!ip) return true; // permitir vazio (vai usar localhost)
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  return m.slice(1).every((oct) => {
    const n = Number(oct);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

export default function ConfigEventoTab({ eventoId }: Props) {
  const [ip1, setIp1] = useState("");
  const [ip2, setIp2] = useState("");
  const [gcTarget, setGcTarget] = useState<VmixTarget>("vmix1");
  const [gcInput, setGcInput] = useState<string>("1");
  const [gcOverlay, setGcOverlay] = useState<string>("1");

  useEffect(() => {
    const cfg = loadConfig(eventoId);
    setIp1(cfg.ip1);
    setIp2(cfg.ip2);
    const preset = cfg.presets?.gcLotes;
    if (preset) {
      setGcTarget(preset.target);
      setGcInput(preset.input);
      setGcOverlay(String(preset.overlay ?? 1));
    }
  }, [eventoId]);

  function salvarIPs() {
    if (!isValidIPv4(ip1) || !isValidIPv4(ip2)) {
      toast.error("IP inválido. Use IPv4 (ex.: 192.168.0.10).");
      return;
    }
    const cfg = loadConfig(eventoId);
    saveConfig(eventoId, { ...cfg, ip1: ip1.trim(), ip2: ip2.trim() });
    toast.success("IPs do vMix salvos! (vazio = localhost)");
  }

  function salvarPresetGCLotes() {
    if (!gcInput.trim()) {
      toast.error("Informe o Input do vMix para o GC LOTES.");
      return;
    }
    let overlayNum = parseInt(gcOverlay || "1", 10);
    if (!Number.isFinite(overlayNum)) overlayNum = 1;
    if (overlayNum < 1 || overlayNum > 4) {
      toast.error("Overlay deve ser entre 1 e 4.");
      return;
    }

    const cfg = loadConfig(eventoId);
    saveConfig(eventoId, {
      ...cfg,
      presets: {
        ...cfg.presets,
        gcLotes: {
          target: gcTarget,
          input: gcInput.trim(),
          overlay: overlayNum,
        },
      },
    });
    toast.success("Preset de GC LOTES salvo!");
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Configurações vMix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <Label>IP do vMix #1</Label>
            <Input
              placeholder="(vazio = localhost)"
              value={ip1}
              onChange={(e) => setIp1(e.target.value)}
            />
          </div>
          <div>
            <Label>IP do vMix #2</Label>
            <Input
              placeholder="(vazio = localhost)"
              value={ip2}
              onChange={(e) => setIp2(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={salvarIPs}>Salvar</Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Botão: GC LOTES</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
          <div>
            <Label>Usar vMix</Label>
            <Select
              value={gcTarget}
              onValueChange={(v) => setGcTarget(v as VmixTarget)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar vMix" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vmix1">
                  vMix #1 ({ip1 || "localhost"})
                </SelectItem>
                <SelectItem value="vmix2">
                  vMix #2 ({ip2 || "localhost"})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Input do vMix</Label>
            <Input
              placeholder="1"
              value={gcInput}
              onChange={(e) => setGcInput(e.target.value)}
            />
          </div>
          <div>
            <Label>Overlay</Label>
            <Input
              placeholder="1"
              value={gcOverlay}
              onChange={(e) => setGcOverlay(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={salvarPresetGCLotes}>Salvar preset</Button>
        </div>
      </Card>
    </div>
  );
}
