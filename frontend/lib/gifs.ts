import { api } from "./api";

export interface GifResult {
  id: string;
  title: string;
  previewUrl: string;
  url: string;
}

export async function searchGifs(query: string): Promise<{ available: boolean; results: GifResult[] }> {
  const res = await api.searchGifs(query);
  return {
    available: res.available,
    results: res.results.map((r) => ({ id: r.id, title: r.title, previewUrl: r.preview_url, url: r.url })),
  };
}
