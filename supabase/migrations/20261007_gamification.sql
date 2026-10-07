-- Gamification system for Études Space
CREATE TABLE IF NOT EXISTS public."GamificationProfile" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL UNIQUE,
  "points" integer NOT NULL DEFAULT 0,
  "currentStreak" integer NOT NULL DEFAULT 0,
  "bestStreak" integer NOT NULL DEFAULT 0,
  "lastActivityDate" date,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "GamificationProfile_points_idx" ON public."GamificationProfile"("points");

CREATE TABLE IF NOT EXISTS public."Badge" (
  "id" text PRIMARY KEY,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "icon" text NOT NULL DEFAULT '🏅',
  "requirementType" text NOT NULL,
  "requirementValue" integer NOT NULL DEFAULT 1,
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Badge_active_idx" ON public."Badge"("active");

CREATE TABLE IF NOT EXISTS public."UserBadge" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "badgeId" text NOT NULL,
  "earnedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE CASCADE,
  CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES public."Badge"("id") ON DELETE CASCADE,
  CONSTRAINT "UserBadge_userId_badgeId_key" UNIQUE ("userId","badgeId")
);
CREATE INDEX IF NOT EXISTS "UserBadge_userId_earnedAt_idx" ON public."UserBadge"("userId","earnedAt");

ALTER TABLE public."GamificationProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Badge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserBadge" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."GamificationProfile" FROM anon, authenticated;
REVOKE ALL ON TABLE public."Badge" FROM anon, authenticated;
REVOKE ALL ON TABLE public."UserBadge" FROM anon, authenticated;
GRANT ALL ON TABLE public."GamificationProfile" TO service_role;
GRANT ALL ON TABLE public."Badge" TO service_role; 
GRANT ALL ON TABLE public."UserBadge" TO service_role;

INSERT INTO public."PlatformSetting" ("id","key","label","description","category","type","value","enabled")
VALUES
(md5('GAMIFICATION_ENABLED'),'GAMIFICATION_ENABLED','Gamification activée','Active les points, séries et badges.','GAMIFICATION','BOOLEAN','true',true),
(md5('POINTS_COMPLETED_TEST'),'POINTS_COMPLETED_TEST','Points par test terminé','Points accordés à chaque test terminé.','GAMIFICATION','NUMBER','10',true),
(md5('POINTS_CORRECT_ANSWER'),'POINTS_CORRECT_ANSWER','Points par bonne réponse','Points accordés pour chaque bonne réponse.','GAMIFICATION','NUMBER','2',true),
(md5('POINTS_PERFECT_TEST'),'POINTS_PERFECT_TEST','Bonus score parfait','Bonus accordé lorsque toutes les réponses sont correctes.','GAMIFICATION','NUMBER','20',true),
(md5('STREAK_BONUS'),'STREAK_BONUS','Bonus série quotidienne','Points accordés à chaque journée consécutive.','GAMIFICATION','NUMBER','5',true)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO public."Badge" ("id","code","name","description","icon","requirementType","requirementValue","active")
VALUES
(md5('FIRST_TEST'),'FIRST_TEST','Premier pas','Tu as terminé ton premier petit test.','🚀','TESTS_COMPLETED',1,true),
(md5('TEN_TESTS'),'TEN_TESTS','Régulier','Tu as terminé 10 petits tests.','🔥','TESTS_COMPLETED',10,true),
(md5('FIFTY_POINTS'),'FIFTY_POINTS','En route','Tu as gagné 50 points.','⭐','POINTS',50,true),
(md5('PERFECT_TEST'),'PERFECT_TEST','Sans faute','Tu as obtenu un score parfait.','🏆','PERFECT_TESTS',1,true),
(md5('SEVEN_STREAK'),'SEVEN_STREAK','Une semaine','Tu as travaillé 7 jours consécutifs.','📅','BEST_STREAK',7,true)
ON CONFLICT ("code") DO NOTHING;