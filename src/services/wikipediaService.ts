/**
 * Serviço de integração com a Wikipedia PT-BR.
 * Estratégia: Wikipedia online → Cache localStorage → Dados offline (fallback).
 * Cache expira em 6 horas para manter as listas atualizadas sem excesso de requisições.
 */

const WIKI_API = 'https://pt.wikipedia.org/w/api.php';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
const FETCH_TIMEOUT_MS = 4000; // 4 segundos antes de cair no fallback

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CacheEntry {
  words: string[];
  timestamp: number;
}

export interface WikiCategoryConfig {
  /** Categoria do Wikipedia PT-BR (ex: "Categoria:Futebolistas_do_Brasil") */
  wikiCategory: string;
  /** Limite de membros a buscar */
  limit?: number;
}

// ─── Categorias mapeadas para o Jogo do Impostor ─────────────────────────────

export const IMPOSTOR_WIKI_MAP: Record<string, WikiCategoryConfig> = {
  animals:   { wikiCategory: 'Categoria:Mamíferos', limit: 200 },
  food:      { wikiCategory: 'Categoria:Pratos_da_culinária_brasileira', limit: 200 },
  places:    { wikiCategory: 'Categoria:Municípios_do_Brasil', limit: 200 },
  jobs:      { wikiCategory: 'Categoria:Profissões', limit: 150 },
  sports:    { wikiCategory: 'Categoria:Esportes', limit: 150 },
  countries: { wikiCategory: 'Categoria:Países', limit: 200 },
  transport: { wikiCategory: 'Categoria:Veículos', limit: 150 },
};

// ─── Categorias mapeadas para o Quem Sou Eu ──────────────────────────────────

export const WHO_AM_I_WIKI_MAP: Record<string, WikiCategoryConfig> = {
  brazilian_celebrities: { wikiCategory: 'Categoria:Atores_de_cinema_do_Brasil', limit: 200 },
  sports_stars:          { wikiCategory: 'Categoria:Futebolistas_do_Brasil', limit: 200 },
  world_celebrities:     { wikiCategory: 'Categoria:Cantores_dos_Estados_Unidos', limit: 200 },
  historical:            { wikiCategory: 'Categoria:Presidentes_do_Brasil', limit: 100 },
  singers_br:            { wikiCategory: 'Categoria:Cantores_do_Brasil', limit: 200 },
  actors_world:          { wikiCategory: 'Categoria:Atores_de_cinema_dos_Estados_Unidos', limit: 200 },
};

// ─── Utilitários internos ─────────────────────────────────────────────────────

/**
 * Verifica se o título é utilizável num jogo de festa:
 * - Exclui páginas de desambiguação
 * - Exclui listas ("Lista de...")
 * - Exclui títulos muito longos ou técnicos
 */
function isUsableTitle(title: string): boolean {
  if (title.includes('(desambiguação)')) return false;
  if (title.toLowerCase().startsWith('lista de')) return false;
  if (title.toLowerCase().startsWith('list of')) return false;
  if (title.includes('Wikipedia:')) return false;
  if (title.includes('Categoria:')) return false;
  if (title.length > 40) return false;
  // Remove entradas que contêm parênteses com qualificadores técnicos
  if (/\(espécie\)|\(gênero\)|\(família\)|\(ordem\)/.test(title)) return false;
  return true;
}

/** Busca com timeout automático */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function getCached(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(`wiki_cache_${key}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
    return entry.words;
  } catch {
    return null;
  }
}

function setCache(key: string, words: string[]): void {
  try {
    const entry: CacheEntry = { words, timestamp: Date.now() };
    localStorage.setItem(`wiki_cache_${key}`, JSON.stringify(entry));
  } catch {
    // localStorage cheio ou indisponível — ignora silenciosamente
  }
}

export function clearWikiCache(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('wiki_cache_'));
  keys.forEach(k => localStorage.removeItem(k));
}

// ─── Busca principal ──────────────────────────────────────────────────────────

/**
 * Busca membros de uma categoria do Wikipedia PT-BR.
 * Retorna array de títulos limpos e utilizáveis no jogo.
 */
async function fetchCategoryMembers(wikiCategory: string, limit: number): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: wikiCategory,
    cmlimit: String(Math.min(limit, 500)),
    cmtype: 'page',
    cmsort: 'timestamp', // ordenação estável
    format: 'json',
    origin: '*',
  });

  const res = await fetchWithTimeout(`${WIKI_API}?${params}`, FETCH_TIMEOUT_MS);
  if (!res.ok) throw new Error(`Wikipedia API error: ${res.status}`);

  const json = await res.json();
  const members: Array<{ title: string }> = json?.query?.categorymembers ?? [];

  return members
    .map(m => m.title)
    .filter(isUsableTitle);
}

// ─── API pública ──────────────────────────────────────────────────────────────

export type WordSource = 'wikipedia' | 'cache' | 'offline';

export interface WordsResult {
  words: string[];
  source: WordSource;
}

/**
 * Obtém palavras para um jogo com a estratégia: Wikipedia → Cache → Offline.
 *
 * @param config    Configuração da categoria do Wikipedia
 * @param cacheKey  Chave única para armazenar no cache (ex: "impostor_animals")
 * @param fallback  Lista local usada quando offline ou em caso de erro
 */
export async function getWords(
  config: WikiCategoryConfig,
  cacheKey: string,
  fallback: string[]
): Promise<WordsResult> {
  // 1. Verificar cache válido
  const cached = getCached(cacheKey);
  if (cached && cached.length >= 10) {
    return { words: cached, source: 'cache' };
  }

  // 2. Tentar buscar no Wikipedia
  try {
    const words = await fetchCategoryMembers(config.wikiCategory, config.limit ?? 200);
    if (words.length >= 5) {
      setCache(cacheKey, words);
      return { words, source: 'wikipedia' };
    }
  } catch {
    // Sem internet ou timeout — usa fallback
  }

  // 3. Dados offline
  return { words: fallback, source: 'offline' };
}
