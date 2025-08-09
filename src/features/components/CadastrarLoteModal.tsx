import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  valor: z.coerce.number(),
  lote: z.string().min(1),
  nome_animal: z.string().min(1),
  gira_1: z.string().optional(),
  gira_2: z.string().optional(),
  gira_3: z.string().optional(),
  gira_4: z.string().optional(),
  gira_5: z.string().optional(),
  gira_6: z.string().optional(),
  condicao_pagamento: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  eventoId: number;
  onSuccess: () => void;
  loteBase?: {
    valor: number;
    lote: string;
    nome_animal: string;
    gira_1?: string;
    gira_2?: string;
    gira_3?: string;
    gira_4?: string;
    gira_5?: string;
    gira_6?: string;
    condicao_pagamento?: string;
  };
}

interface Evento {
  id: number;
  condicao_pagamento_padrao?: string;
}

export default function CadastrarLoteModal({
  eventoId,
  onSuccess,
  loteBase,
}: Props) {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [condicaoSelecionada, setCondicaoSelecionada] = useState("");
  const [outraCondicao, setOutraCondicao] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (loteBase) {
      reset({
        valor: loteBase.valor,
        lote: loteBase.lote,
        nome_animal: loteBase.nome_animal,
        gira_1: loteBase.gira_1 ?? "",
        gira_2: loteBase.gira_2 ?? "",
        gira_3: loteBase.gira_3 ?? "",
        gira_4: loteBase.gira_4 ?? "",
        gira_5: loteBase.gira_5 ?? "",
        gira_6: loteBase.gira_6 ?? "",
        condicao_pagamento: loteBase.condicao_pagamento ?? "",
      });

      if (
        loteBase.condicao_pagamento &&
        !condicoesPredefinidas.includes(loteBase.condicao_pagamento)
      ) {
        setCondicaoSelecionada("Outro");
        setOutraCondicao(loteBase.condicao_pagamento);
      } else {
        setCondicaoSelecionada(loteBase.condicao_pagamento ?? "");
      }
    }
  }, [loteBase, reset]);

  useEffect(() => {
    fetch(`http://localhost:3030/eventos/${eventoId}`)
      .then((res) => res.json())
      .then(setEvento)
      .catch((err) => {
        console.error("Erro ao buscar evento:", err);
      });
  }, [eventoId]);

  const condicoesPredefinidas = [
    "2 + 2 + 2 + 2 + 2 + 20 = 30",
    "Entrada + 30 + 60",
    "À vista",
  ];

  const handleCondicaoChange = (value: string) => {
    setCondicaoSelecionada(value);
    if (value !== "Outro") {
      setValue("condicao_pagamento", value);
    } else {
      setValue("condicao_pagamento", outraCondicao);
    }
  };

  const handleOutraCondicaoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setOutraCondicao(value);
    if (condicaoSelecionada === "Outro") {
      setValue("condicao_pagamento", value);
    }
  };

  async function onSubmit(data: FormData) {
    const condicaoFinal = data.condicao_pagamento?.trim()
      ? data.condicao_pagamento
      : evento?.condicao_pagamento_padrao ?? "";

    const payload = {
      ...data,
      evento_id: eventoId,
      condicao_pagamento: condicaoFinal,
    };

    const res = await fetch("http://localhost:3030/lotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success("Lote cadastrado com sucesso");
      onSuccess();
      reset();
      setCondicaoSelecionada("");
      setOutraCondicao("");
    } else {
      toast.error("Erro ao cadastrar lote");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Lote</Label>
          <Input {...register("lote")} />
          {errors.lote && (
            <p className="text-red-500 text-sm">{errors.lote.message}</p>
          )}
        </div>

        <div>
          <Label>Valor</Label>
          <Input type="number" step="0.01" {...register("valor")} />
          {errors.valor && (
            <p className="text-red-500 text-sm">{errors.valor.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label>Nome do Animal</Label>
        <Input {...register("nome_animal")} />
        {errors.nome_animal && (
          <p className="text-red-500 text-sm">{errors.nome_animal.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i}>
            <Label>GIRA {i}</Label>
            <Input {...register(`gira_${i}` as keyof FormData)} />
          </div>
        ))}
      </div>

      <div>
        <Label>Condição de Pagamento</Label>
        <Select
          value={condicaoSelecionada}
          onValueChange={handleCondicaoChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a condição" />
          </SelectTrigger>
          <SelectContent>
            {condicoesPredefinidas.map((condicao) => (
              <SelectItem key={condicao} value={condicao}>
                {condicao}
              </SelectItem>
            ))}
            <SelectItem value="Outro">Outro</SelectItem>
          </SelectContent>
        </Select>

        {condicaoSelecionada === "Outro" && (
          <Input
            className="mt-2"
            placeholder="Digite a condição personalizada"
            value={outraCondicao}
            onChange={handleOutraCondicaoChange}
          />
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
