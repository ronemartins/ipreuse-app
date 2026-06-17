-- Add new columns to ip_core table
ALTER TABLE ip_core ADD COLUMN IF NOT EXISTS part_number varchar;
ALTER TABLE ip_core ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'Active';
ALTER TABLE ip_core ADD COLUMN IF NOT EXISTS overview text;
ALTER TABLE ip_core ADD COLUMN IF NOT EXISTS functional_description text;
ALTER TABLE ip_core ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb;
ALTER TABLE ip_core ADD COLUMN IF NOT EXISTS applications jsonb DEFAULT '[]'::jsonb;
ALTER TABLE ip_core ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '[]'::jsonb;
ALTER TABLE ip_core ADD COLUMN IF NOT EXISTS image_data bytea;
ALTER TABLE ip_core ADD COLUMN IF NOT EXISTS image_mime_type varchar;

-- Create groups table if not exists
CREATE TABLE IF NOT EXISTS public.groups (
  id SERIAL PRIMARY KEY,
  name varchar NOT NULL,
  description text,
  technology varchar,
  company_id integer,
  created_by integer NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  CONSTRAINT fk_group_creator FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Create group_members table if not exists
CREATE TABLE IF NOT EXISTS public.group_members (
  id SERIAL PRIMARY KEY,
  group_id integer NOT NULL,
  user_id integer NOT NULL,
  role varchar DEFAULT 'membro',
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gm_group FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT fk_gm_user FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT unique_group_user UNIQUE(group_id, user_id)
);

-- Seed initial group data if no groups exist
INSERT INTO public.groups (name, description, technology, company_id, created_by) 
SELECT 'RF Design Team', 'Grupo focado em desenvolvimento de IPs de radiofrequência para aplicações de alta frequência', 'RF', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM public.groups WHERE name = 'RF Design Team');

-- Insert current group members if this is our seed group
INSERT INTO public.group_members (group_id, user_id, role)
SELECT g.id, 1, 'lider' FROM public.groups g WHERE g.name = 'RF Design Team' AND NOT EXISTS (
  SELECT 1 FROM public.group_members WHERE group_id = g.id AND user_id = 1
);
