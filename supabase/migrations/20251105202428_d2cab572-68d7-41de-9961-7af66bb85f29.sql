-- Create a simple system table to initialize the database schema
-- This will trigger the automatic generation of types.ts

CREATE TABLE IF NOT EXISTS public.app_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow reading config (public access for app configuration)
CREATE POLICY "Allow public read access to app config"
ON public.app_config
FOR SELECT
USING (true);

-- Only allow service role to insert/update config
CREATE POLICY "Only service role can modify config"
ON public.app_config
FOR ALL
USING (false);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial config
INSERT INTO public.app_config (key, value) VALUES 
  ('app_name', '"Legacy Converter"'::jsonb),
  ('version', '"1.0.0"'::jsonb)
ON CONFLICT (key) DO NOTHING;