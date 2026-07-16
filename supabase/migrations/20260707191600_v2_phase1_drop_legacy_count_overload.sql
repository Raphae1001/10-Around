-- MinyanNow v2 — Phase 1 (suite) : supprime la surcharge 3-args obsolète de count_minyanim_within.
-- Raison : son corps référence encore le type enum 'airport' (supprimé en Phase 1) et elle crée
-- une ambiguïté de résolution avec la version 4-args (seule utilisée par le client, cf. create.tsx).
DROP FUNCTION IF EXISTS public.count_minyanim_within(double precision, double precision, integer);
