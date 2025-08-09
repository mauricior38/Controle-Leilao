// src/features/lotes/components/EditarLoteModal.tsx
import { z } from "zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  lote: {
    id?: number;
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
  eventoId: number;
  modo?: "editar" | "copia";
  onSuccess: () => void;
}

export default function EditarLoteModal({
  lote,
  eventoId,
  modo = "editar",
  onSuccess,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (!lote) return;

    reset({
      valor: lote.valor,
      lote: lote.lote,
      nome_animal: lote.nome_animal,
      gira_1: lote.gira_1 ?? "",
      gira_2: lote.gira_2 ?? "",
      gira_3: lote.gira_3 ?? "",
      gira_4: lote.gira_4 ?? "",
      gira_5: lote.gira_5 ?? "",
      gira_6: lote.gira_6 ?? "",
      condicao_pagamento: lote.condicao_pagamento ?? "",
    });
  }, [lote, reset]);

  async function onSubmit(data: FormData) {
    const url =
      modo === "copia"
        ? "http://localhost:3030/lotes"
        : `http://localhost:3030/lotes/${lote.id}`;

    const method = modo === "copia" ? "POST" : "PATCH";

    const payload = {
      ...data,
      ...(modo === "copia" ? { evento_id: eventoId } : {}),
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(
        modo === "copia"
          ? "Lote copiado com sucesso"
          : "Lote atualizado com sucesso"
      );
      onSuccess(); // <- Atualiza a lista automaticamente
    } else {
      toast.error("Erro ao salvar lote");
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
        <Input {...register("condicao_pagamento")} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
