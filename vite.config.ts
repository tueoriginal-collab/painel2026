import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

// Config Vite independente (sem Lovable). Reproduz o essencial do antigo
// @lovable.dev/vite-tanstack-config: tanstackStart + React + Tailwind +
// alias de tsconfig + Nitro no build (detecta Netlify/Node automaticamente) +
// injeção das variáveis VITE_* no bundle do cliente.
export default defineConfig(async ({ mode, command }) => {
  // Expõe as variáveis VITE_* (definidas no Netlify ou em arquivos .env) para o
  // código do cliente via import.meta.env, garantindo a substituição no build.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const define: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    define[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const plugins = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Redireciona o entry do servidor para src/server.ts (nosso wrapper de erro SSR).
      server: { entry: "server" },
    }),
    viteReact(),
  ];

  // Nitro apenas no build. Sem preset fixo: detecta o alvo automaticamente
  // (Netlify durante o deploy, Node localmente).
  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    plugins.push(nitro());
  }

  return {
    define,
    server: { host: "::", port: 8080 },
    resolve: {
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    plugins,
  };
});
