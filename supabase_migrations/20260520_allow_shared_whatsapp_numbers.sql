-- Allow more than one user to register with the same WhatsApp number.
-- Safe to run on an existing Supabase database.

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_telefono_whatsapp_key;

DROP INDEX IF EXISTS public.idx_usuarios_telefono_whatsapp;

CREATE INDEX IF NOT EXISTS idx_usuarios_telefono_whatsapp
  ON public.usuarios(telefono_whatsapp)
  WHERE telefono_whatsapp IS NOT NULL;
