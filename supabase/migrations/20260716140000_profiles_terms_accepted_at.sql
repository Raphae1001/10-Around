-- Preuve d'acceptation des CGU / confidentialité (horodatée).
-- Nullable : profils existants inchangés ; remplie à l'onboarding.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

COMMENT ON COLUMN public.profiles.terms_accepted_at IS
  'Timestamp when the user accepted Terms of Service and Privacy Policy during onboarding.';
