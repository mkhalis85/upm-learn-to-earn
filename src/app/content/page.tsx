import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import type { Content } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("content")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (sp.category) query = query.eq("category", sp.category);
  if (sp.type) query = query.eq("type", sp.type);
  if (sp.q) query = query.ilike("title", `%${sp.q}%`);

  const { data } = await query;
  const items = (data as Content[]) ?? [];

  const { data: catRows } = await supabase
    .from("content")
    .select("category")
    .eq("status", "approved");
  const categories = Array.from(
    new Set((catRows ?? []).map((r: { category: string | null }) => r.category).filter(Boolean))
  ) as string[];

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">Browse content</h1>
      <p className="mt-1 text-sm text-gray-500">Complete anything below to earn points.</p>

      <form className="mt-6 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search title…"
          className="input flex-1 min-w-[180px]" />
        <select name="category" defaultValue={sp.category ?? ""} className="input w-auto">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="type" defaultValue={sp.type ?? ""} className="input w-auto">
          <option value="">All types</option>
          <option value="article">Article</option>
          <option value="pdf">PDF</option>
        </select>
        <button className="btn-primary">Filter</button>
      </form>

      {items.length === 0 ? (
        <div className="card mt-8 p-10 text-center text-gray-500">
          No content yet. Be the first to <Link href="/upload" className="text-upm font-semibold hover:underline">upload</Link>.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {items.map((c) => (
            <Link key={c.id} href={`/content/${c.id}`} className="card card-hover block p-5">
              <div className="flex items-center justify-between">
                <span className={`chip ${c.type === "pdf" ? "bg-red-50 text-red-600" : "bg-upm-light text-upm"}`}>
                  {c.type === "pdf" ? "📄 PDF" : "📝 Article"}
                </span>
                {c.category && <span className="text-xs font-medium text-gray-400">{c.category}</span>}
              </div>
              <h2 className="mt-3 font-bold leading-snug">{c.title}</h2>
              <p className="mt-1.5 text-sm text-gray-500 line-clamp-2 leading-relaxed">{c.description}</p>
              <div className="mt-3 text-xs font-semibold text-upm">Complete for +10 pts →</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
