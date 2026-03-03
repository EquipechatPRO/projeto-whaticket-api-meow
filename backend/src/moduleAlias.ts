/**
 * Runtime module alias: redireciona `@whiskeysockets/baileys` para o compat shim
 * que prioriza o fork `@itsukichan/baileys`.
 *
 * IMPORTANTE: Este arquivo DEVE ser importado antes de qualquer outro módulo
 * que use Baileys (primeiro import em server.ts).
 *
 * O tsconfig.json faz o mesmo redirecionamento em compile-time,
 * mas o TypeScript NÃO reescreve os `require()` no JS compilado.
 * Sem este hook, o runtime carrega @whiskeysockets/baileys diretamente.
 */
import Module from "module";
import path from "path";

const originalResolveFilename = (Module as any)._resolveFilename;

(Module as any)._resolveFilename = function (
  request: string,
  parent: any,
  isMain: boolean,
  options: any
) {
  // Evitar recursão: se já estamos dentro do compat shim, não redirecionar
  const parentFilename = parent?.filename || "";
  const isFromCompat = parentFilename.includes("compat/baileys") ||
    parentFilename.includes("compat\\baileys");

  if (request === "@whiskeysockets/baileys" && !isFromCompat) {
    // Redirecionar para o compat shim compilado
    const compatPath = path.join(__dirname, "compat", "baileys");
    try {
      return originalResolveFilename.call(this, compatPath, parent, isMain, options);
    } catch {
      // Se compat não existe, tentar fork diretamente
      try {
        return originalResolveFilename.call(this, "@itsukichan/baileys", parent, isMain, options);
      } catch {
        // Fallback: usar o pacote original
      }
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
