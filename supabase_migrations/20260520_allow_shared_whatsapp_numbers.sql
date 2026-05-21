-- Allow more than one user to register with the same WhatsApp number.
-- Safe to run on an existing Supabase database.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS telefono_codigo_pais VARCHAR(8),
  ADD COLUMN IF NOT EXISTS telefono_numero VARCHAR(30),
  ADD COLUMN IF NOT EXISTS telefono_whatsapp VARCHAR(40);

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_telefono_whatsapp_key;

DROP INDEX IF EXISTS public.idx_usuarios_telefono_whatsapp;

CREATE INDEX IF NOT EXISTS idx_usuarios_telefono_whatsapp
  ON public.usuarios(telefono_whatsapp)
  WHERE telefono_whatsapp IS NOT NULL;
