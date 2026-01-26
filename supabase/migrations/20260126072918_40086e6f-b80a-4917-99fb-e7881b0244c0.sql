-- Add ward column to panchayaths table for location hierarchy
ALTER TABLE public.panchayaths 
ADD COLUMN ward text;

-- Create index for faster lookups
CREATE INDEX idx_panchayaths_ward ON public.panchayaths(ward);

-- Add state column to track state-level hierarchy
ALTER TABLE public.panchayaths 
ADD COLUMN state text DEFAULT 'Kerala';

-- Update RLS policies for clusters to allow admins to manage clusters
CREATE POLICY "Admins can manage clusters in their division"
ON public.clusters
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND panchayath_id IN (
    SELECT p.id FROM public.panchayaths p
    WHERE p.id = clusters.panchayath_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);