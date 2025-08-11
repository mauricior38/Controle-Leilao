// src/features/eventos/components/NovoEventoDialog.tsx
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

const condicoes = [
  "2 + 2 + 2 + 2 + 2 + 20 = 30",
  "2 + 2 + 2 + 2 + 2 + 30 = 40",
  "2 + 2 + 2 + 2 + 2 + 40 = 50",
  "1 + 49 = 50",
  "1 + 39 = 40",
  "1 + 29 = 30",
  "outro",
];

const formSchema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  data: z.date({ required_error: "Data obrigatória" }),
  horario: z.string().min(1, "Horário obrigatório"),
  descricao: z.string().optional(),
  condicao_pagamento_padrao: z.string().optional(),
});

export function NovoEventoDialog({ onSave }: { onSave?: () => void }) {
  const [open, setOpen] = useState(false);
  const [condicaoCustom, setCondicaoCustom] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const data = watch("data");
  const condicao = watch("condicao_pagamento_padrao");
  // const horario = watch("horario");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const [hora, minuto] = values.horario.split(":");
      const dataCompleta = new Date(values.data);
      dataCompleta.setHours(Number(hora));
      dataCompleta.setMinutes(Number(minuto));

      await apiFetch("/eventos", {
        method: "POST",
        body: JSON.stringify({
          nome: values.nome,
          data: dataCompleta.toISOString(),
          start_time: dataCompleta.toISOString(),
          descricao: values.descricao,
          condicao_pagamento_padrao:
            values.condicao_pagamento_padrao === "outro"
              ? condicaoCustom
              : values.condicao_pagamento_padrao,
        }),
      });

      toast.success("Evento criado com sucesso!");
      setOpen(false);
      reset();
      onSave?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Erro ao criar evento:", error);
      toast.error(error?.message || "Erro ao criar evento");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Novo Evento</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Nome do Evento</Label>
            <Input {...register("nome")} />
            {errors.nome && (
              <p className="text-red-500 text-sm">{errors.nome.message}</p>
            )}
          </div>

          <div className="flex gap-4">
            <div className="w-1/2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left",
                      !data && "text-muted-foreground"
                    )}
                  >
                    {data ? format(data, "dd/MM/yyyy") : "Selecionar data"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <Calendar
                    mode="single"
                    selected={data}
                    onSelect={(date) => setValue("data", date!)}
                    initialFocus
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                  />
                </PopoverContent>
              </Popover>
              {errors.data && (
                <p className="text-red-500 text-sm">{errors.data.message}</p>
              )}
            </div>

            <div className="w-1/2">
              <Label>Horário</Label>
              <Input type="time" {...register("horario")} />
              {errors.horario && (
                <p className="text-red-500 text-sm">{errors.horario.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Condição de Pagamento Padrão</Label>
            <Select
              value={condicao}
              onValueChange={(value) =>
                setValue("condicao_pagamento_padrao", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar condição" />
              </SelectTrigger>
              <SelectContent>
                {condicoes.map((cond) => (
                  <SelectItem key={cond} value={cond}>
                    {cond}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {condicao === "outro" && (
              <Input
                className="mt-2"
                placeholder="Informe a condição personalizada"
                value={condicaoCustom}
                onChange={(e) => setCondicaoCustom(e.target.value)}
              />
            )}
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea {...register("descricao")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
