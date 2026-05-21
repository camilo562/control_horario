-- Run this on the existing Supabase project. It is safe for an existing DB:
-- it does not drop tables or delete production data.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS telefono_codigo_pais VARCHAR(8),
  ADD COLUMN IF NOT EXISTS telefono_numero VARCHAR(30),
  ADD COLUMN IF NOT EXISTS telefono_whatsapp VARCHAR(40),
  ADD COLUMN IF NOT EXISTS face_descriptor JSONB DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_telefono_whatsapp
  ON public.usuarios(telefono_whatsapp)
  WHERE telefono_whatsapp IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'usuarios'
      AND policyname = 'Usuarios pueden crear su propio perfil inicial'
  ) THEN
    CREATE POLICY "Usuarios pueden crear su propio perfil inicial"
      ON public.usuarios FOR INSERT TO authenticated
      WITH CHECK (id = auth.uid()::text);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metadata JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  profile_name TEXT := COALESCE(NULLIF(metadata->>'nombre', ''), split_part(NEW.email, '@', 1));
  clean_avatar TEXT := UPPER(LEFT(REGEXP_REPLACE(profile_name, '[^[:alnum:]]', '', 'g'), 2));
BEGIN
  INSERT INTO public.usuarios (
    id,
    nombre,
    email,
    rol,
    avatar,
    cargo,
    telefono_codigo_pais,
    telefono_numero,
    telefono_whatsapp,
    activo
  )
  VALUES (
    NEW.id::text,
    profile_name,
    NEW.email,
    CASE
      WHEN metadata->>'rol' IN ('Empleado', 'Administrador') THEN metadata->>'rol'
      ELSE 'Empleado'
    END,
    COALESCE(NULLIF(clean_avatar, ''), 'US'),
    COALESCE(NULLIF(metadata->>'cargo', ''), 'Operario de Confeccion'),
    NULLIF(metadata->>'telefono_codigo_pais', ''),
    NULLIF(metadata->>'telefono_numero', ''),
    NULLIF(metadata->>'telefono_whatsapp', ''),
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    email = EXCLUDED.email,
    rol = EXCLUDED.rol,
    avatar = EXCLUDED.avatar,
    cargo = EXCLUDED.cargo,
    telefono_codigo_pais = EXCLUDED.telefono_codigo_pais,
    telefono_numero = EXCLUDED.telefono_numero,
    telefono_whatsapp = EXCLUDED.telefono_whatsapp,
    activo = TRUE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
