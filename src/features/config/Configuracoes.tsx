import { useState } from "react";
import { getApiBaseUrl, setApiBaseUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Configuracoes() {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [token, setToken] = useState(localStorage.getItem("apiToken") || "");
  const [status, setStatus] = useState<string>("");

  async function testar() {
    try {
      localStorage.setItem("apiToken", token.trim());
      const res = await fetch(`${url}/health`);
      const j = await res.json();
      if (j?.ok) setStatus(`Conectado ao host: ${j.host} (v${j.version})`);
      else setStatus("Host respondeu, mas não ok");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setStatus("Falha: " + (e?.message || e));
    }
  }

  function salvar() {
    setApiBaseUrl(url);
    localStorage.setItem("apiToken", token.trim());
    setStatus("Salvo. Agora suas chamadas usam " + url);
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-xl font-bold">Configurações de Rede</h2>
      <label className="block">
        <span className="text-sm">
          Endereço do host (ex.: http://192.168.0.10:3030)
        </span>
        <input
          className="border p-2 w-full rounded"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-sm">API Token (opcional, recomendado)</span>
        <input
          className="border p-2 w-full rounded"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </label>

      <div className="flex gap-2">
        <Button
          className="px-3 py-2 rounded bg-blue-600 text-white"
          onClick={testar}
        >
          Testar conexão
        </Button>
        <Button
          className="px-3 py-2 rounded bg-green-600 text-white"
          onClick={salvar}
        >
          Salvar
        </Button>

        <Button className="px-3 py-2 rounded" onClick={salvar}>
          <Link to={"/"}>Voltar</Link>
        </Button>
      </div>

      {status && <div className="text-sm opacity-80">{status}</div>}
      <p className="text-xs text-muted-foreground">
        Dica: no HOST deixe a API em 0.0.0.0:3030 e compartilhe o token com quem
        precisa entrar.
      </p>
    </div>
  );
}
