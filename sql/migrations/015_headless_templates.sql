-- 015_headless_templates.sql
-- Create a dedicated table for V2 headless templates

CREATE TABLE IF NOT EXISTS public.headless_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    preview_url TEXT,
    theme_code TEXT NOT NULL,
    category TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    config_schema JSONB DEFAULT '{}'::jsonb,
    documentation_url TEXT,
    required_plans TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.headless_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active templates
CREATE POLICY "headless_templates_read_public" 
    ON public.headless_templates FOR SELECT 
    USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Policy: Only admins can manage templates
CREATE POLICY "headless_templates_admin_all" 
    ON public.headless_templates FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_headless_templates_updated_at
    BEFORE UPDATE ON public.headless_templates
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
