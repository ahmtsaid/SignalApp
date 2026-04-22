/**
 * .NET SignalApp API ile konuşma katmanı.
 * Her istekte Supabase `access_token` Authorization header olarak eklenir.
 * Gövde/yanıt: backend `Signal` ↔ UI `TaskItem` (status yüzde dönüşümü burada).
 */
import axios from 'axios';
import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Backend API URL — .env → EXPO_PUBLIC_API_URL (sondaki / kırpılır)
// ─────────────────────────────────────────────────────────────────────────────
const RAW_BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").trim();
const BASE_URL = RAW_BASE.replace(/\/$/, "");

function requireApiBase(): string {
  if (!BASE_URL) {
    throw new Error(
      "EXPO_PUBLIC_API_URL tanımlı değil veya boş. Frontend/.env içine backend kök adresini yazın (örn. https://xxx.up.railway.app)."
    );
  }
  return BASE_URL;
}

if (__DEV__ && !RAW_BASE) {
  console.warn(
    "[api] EXPO_PUBLIC_API_URL ayarlı değil — sinyal eklemek için .env dosyasına API adresini ekleyin."
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskItem tipi (index.tsx'deki ile aynı, circular import'tan kaçınmak için
// burada da tanımlıyoruz — sadece API katmanının ihtiyacı olan alanlar)
// ─────────────────────────────────────────────────────────────────────────────
export interface ApiTask {
  id:     string;
  text:   string;
  note:   string;
  status: number; // -1=girilmedi, 0-1.0=oran (0.8 → %80)
  date:   string; // YYYY-MM-DD
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper — Supabase oturumundan JWT al
// ─────────────────────────────────────────────────────────────────────────────
async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Oturum açılmamış');
  return { Authorization: `Bearer ${session.access_token}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend Signal → ApiTask dönüşümü
//   Backend: status 0-100 (int) veya -1
//   Frontend: status 0-1.0 (float) veya -1
// ─────────────────────────────────────────────────────────────────────────────
function fromSignal(signal: any): ApiTask {
  return {
    id:     String(signal.id),
    text:   signal.title        ?? '',
    note:   signal.description  ?? '',
    date:   signal.date         ?? '',
    status: signal.status === -1 ? -1 : (signal.status ?? 0) / 100,
  };
}

function toSignal(task: Partial<ApiTask>) {
  return {
    title:       task.text        ?? '',
    description: task.note        ?? '',
    targetValue: 100,
    date:        task.date        ?? '',
    status:      task.status === undefined ? -1
                 : task.status   === -1   ? -1
                 : Math.round(task.status * 100),
    sortOrder:   0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API fonksiyonları
// ─────────────────────────────────────────────────────────────────────────────
export const api = {

  /** Kullanıcının tüm sinyallerini getir (isteğe bağlı tarih filtresi) */
  async getSignals(date?: string): Promise<ApiTask[]> {
    const base    = requireApiBase();
    const headers = await authHeaders();
    const params  = date ? { date } : undefined;
    const res     = await axios.get(`${base}/api/signals`, { headers, params });
    return (res.data as any[]).map(fromSignal);
  },

  /** Yeni sinyal oluştur */
  async createSignal(task: Partial<ApiTask>): Promise<ApiTask> {
    const base    = requireApiBase();
    const headers = await authHeaders();
    const res     = await axios.post(`${base}/api/signals`, toSignal(task), { headers });
    return fromSignal(res.data);
  },

  /** Sinyal güncelle (başlık, not, status) */
  async updateSignal(id: string, updates: {
    text?:   string;
    note?:   string;
    status?: number;
  }): Promise<ApiTask> {
    const headers = await authHeaders();
    const body: any = {};
    if (updates.text   !== undefined) body.title       = updates.text;
    if (updates.note   !== undefined) body.description = updates.note;
    if (updates.status !== undefined)
      body.status = updates.status === -1 ? -1 : Math.round(updates.status * 100);
    const base = requireApiBase();
    const res = await axios.patch(`${base}/api/signals/${id}`, body, { headers });
    return fromSignal(res.data);
  },

  /** Belirli bir günün sıralama düzenini kaydet */
  async reorderSignals(orderedIds: string[]): Promise<void> {
    const headers = await authHeaders();
    const body    = orderedIds.map((id, index) => ({
      id:        parseInt(id, 10),
      sortOrder: index,
    }));
    const base = requireApiBase();
    await axios.post(`${base}/api/signals/reorder`, body, { headers });
  },

  /** Sinyal sil */
  async deleteSignal(id: string): Promise<void> {
    const headers = await authHeaders();
    const base = requireApiBase();
    await axios.delete(`${base}/api/signals/${id}`, { headers });
  },
};
