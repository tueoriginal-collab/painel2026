import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Plus, Trash2, Copy } from "lucide-react";

import { useAuth, MODULES } from "@/lib/auth";
import { useViewAs } from "@/lib/viewas";
import {
  createUser,
  deleteUser,
  duplicateUser,
  listUsers,
  updateUser,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/painel/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Ghost Copier" },
      { name: "description", content: "Administração de usuários e permissões." },
    ],
  }),
  component: Usuarios,
});

type Row = {
  id: string;
  username: string;
  display_name: string | null;
  modules: string[];
  expires_at: string | null;
  is_admin: boolean;
};

function Usuarios() {
  const { isAdmin } = useAuth();
  const { setViewAs } = useViewAs();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    expires_at: "",
    modules: [] as string[],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    enabled: isAdmin,
    queryFn: async () => (await listUsers()) as unknown as Row[],
  });

  if (!isAdmin) return <p className="text-muted-foreground">Área exclusiva do administrador.</p>;

  const refresh = () => void qc.invalidateQueries({ queryKey: ["users"] });
  const filtered = users.filter((u) => u.username.includes(filter.toLowerCase()));

  const expiring = (u: Row) =>
    u.expires_at && new Date(u.expires_at).getTime() - Date.now() < 3 * 864e5;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">Módulos, validade e suporte.</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Filtrar"
            className="w-40"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" /> Novo login
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo login</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Validade (opcional)</Label>
                  <Input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Módulos que este usuário pode usar</Label>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() =>
                        setForm({
                          ...form,
                          modules:
                            form.modules.length === MODULES.length
                              ? []
                              : MODULES.map((m) => m.key),
                        })
                      }
                    >
                      {form.modules.length === MODULES.length
                        ? "Limpar todos"
                        : "Selecionar todos"}
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {MODULES.map((m) => {
                      const checked = form.modules.includes(m.key);
                      return (
                        <label
                          key={m.key}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            checked
                              ? "border-primary/60 bg-primary/10 text-foreground"
                              : "border-border/70 hover:border-primary/40"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              setForm({
                                ...form,
                                modules: v
                                  ? [...form.modules, m.key]
                                  : form.modules.filter((x) => x !== m.key),
                              })
                            }
                          />
                          {m.label}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deixe desmarcado o que o usuário não deve acessar.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    try {
                      await createUser({ data: { ...form, expires_at: form.expires_at || null } });
                      setOpen(false);
                      setForm({ username: "", password: "", expires_at: "", modules: [] });
                      refresh();
                      toast.success("Login criado.");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Falhou");
                    }
                  }}
                >
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid gap-4">
        {filtered.map((u) => (
          <Card key={u.id}>
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-40 flex-1">
                <p className="font-semibold">
                  @{u.username} {u.is_admin && <span className="text-xs text-primary">admin</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {u.expires_at
                    ? `Válido até ${new Date(u.expires_at).toLocaleDateString("pt-BR")}`
                    : "Sem validade"}
                  {expiring(u) && <span className="ml-2 text-destructive">expira em breve</span>}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {MODULES.map((m) => (
                  <label key={m.key} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={u.modules.includes(m.key)}
                      onCheckedChange={async (v) => {
                        const mods = v
                          ? [...u.modules, m.key]
                          : u.modules.filter((x) => x !== m.key);
                        await updateUser({ data: { id: u.id, modules: mods } });
                        refresh();
                      }}
                    />
                    {m.label}
                  </label>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Input
                  type="date"
                  className="w-36"
                  defaultValue={u.expires_at?.slice(0, 10) ?? ""}
                  onChange={async (e) => {
                    await updateUser({ data: { id: u.id, expires_at: e.target.value || null } });
                    refresh();
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const pass = prompt(`Nova senha para @${u.username}`);
                    if (!pass) return;
                    await updateUser({ data: { id: u.id, password: pass } });
                    toast.success("Senha atualizada.");
                  }}
                >
                  Resetar senha
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setViewAs({ id: u.id, username: u.username });
                    void navigate({ to: "/painel/telas" });
                  }}
                >
                  <Eye className="mr-1 size-4" /> Entrar como
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const username = prompt("Usuário da cópia");
                    const password = prompt("Senha da cópia");
                    if (!username || !password) return;
                    await duplicateUser({ data: { id: u.id, username, password } });
                    refresh();
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                {!u.is_admin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!confirm(`Apagar @${u.username}?`)) return;
                      await deleteUser({ data: { id: u.id } });
                      refresh();
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
