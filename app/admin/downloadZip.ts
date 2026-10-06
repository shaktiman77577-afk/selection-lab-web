// Questions ka ZIP (TSV + images) download — Mock Tests tab aur Question Bank
// dono yahi use karte hain. Normal api() JSON padhta hai, ZIP nahi, isliye alag.
// Backend: selection-lab-api/routers/question_export.py  (/api/qexport/...)

import { API_URL } from "@/lib/config";

const TOKEN_KEY = "sl_admin_token";

export async function downloadZip(path: string, fallbackName: string): Promise<void> {
  const token = typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_KEY) || "";
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const d = (data as any).detail;
    throw new Error(typeof d === "string" && d ? d : `Download nahi hua (${res.status})`);
  }

  // Server naam bhejta hai (series ka naam + tareekh); na mile to apna
  const cd = res.headers.get("Content-Disposition") || "";
  const m = cd.match(/filename="?([^";]+)"?/i);
  const name = m ? m[1] : fallbackName;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
