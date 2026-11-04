-- Tabla para guardar en la nube las partidas del Modo Historia (las 3 ranuras de cada usuario).
-- Ejecutar una vez en Supabase: Dashboard -> SQL Editor -> New query -> pegar -> Run.
-- Es independiente de la tabla "saves" del tycoon.
create table if not exists public.historia (
  id    uuid primary key references auth.users (id) on delete cascade,
  slots jsonb not null default '{}'::jsonb,
  ts    bigint
);

alter table public.historia enable row level security;

-- Cada usuario solo puede ver y cambiar su propia fila.
create policy "historia: leer la mia"   on public.historia for select using (auth.uid() = id);
create policy "historia: crear la mia"  on public.historia for insert with check (auth.uid() = id);
create policy "historia: cambiar la mia" on public.historia for update using (auth.uid() = id) with check (auth.uid() = id);
