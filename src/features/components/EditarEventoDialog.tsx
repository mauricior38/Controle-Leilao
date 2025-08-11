// src/features/eventos/components/EditarEventoDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const formSchema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  data: z.date({ required_error: "Data obrigatória" }),
  descricao: z.string().optional(),
});

type EditarEventoDialogProps = {
  evento: {
    id: number;
    nome: string;
    data: string;
    descricao?: string;
  };
  onSave?: () => void;
};

export function EditarEventoDialog({ evento, onSave }: EditarEventoDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: evento.nome,
      data: new Date(evento.data),
      descricao: evento.descricao || "",
    },
  });

  const data = watch("data");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await apiFetch(`/eventos/${evento.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nome: values.nome,
          data: values.data.toISOString(),
          descricao: values.descricao,
        }),
      });
      toast.success("Evento atualizado");
      setOpen(false);
      onSave?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao atualizar evento");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Editar</Button>
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

          <div>
            <Label>Data e Hora</Label>
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
                  {data ? (
                    format(data, "dd/MM/yyyy HH:mm")
                  ) : (
                    <span>Selecionar data</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={(date) => date && setValue("data", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.data && (
              <p className="text-red-500 text-sm">{errors.data.message}</p>
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
