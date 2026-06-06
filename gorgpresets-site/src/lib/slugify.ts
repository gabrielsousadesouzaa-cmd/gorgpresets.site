/**
 * Converte um nome de produto para um slug amigável para URL.
 * Ex: "DEEP BLACK Pack" → "deep-black-pack"
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")                         // Decompõe acentos (ã → a + combining)
    .replace(/[\u0300-\u036f]/g, "")          // Remove combining marks (acentos)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")            // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, "-")                     // Espaços → hífens
    .replace(/-+/g, "-");                     // Hífens múltiplos → um só
}
