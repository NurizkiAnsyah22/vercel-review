-- QR Master flow: every printed card carries the SAME QR Master
-- ({PUBLIC_APP_URL}/activate), so the card is identified during activation by a
-- random, opaque "Kode Aktivasi" (activationCode) instead of the QR itself.
--
-- Safety: non-destructive. The column is added as NULLABLE (existing rows are
-- then backfilled) and a unique index is created afterwards. Knowing the public
-- sequential Card ID (`code`) can never activate a card.

ALTER TABLE "cards" ADD COLUMN "activationCode" VARCHAR(32);

-- Backfill existing rows. Deterministic and derived from the internal uuid
-- (not published anywhere), so it is not derivable from the public Card ID.
UPDATE "cards"
SET "activationCode" = 'VRC-'
  || upper(substr(md5("id"::text), 1, 4))
  || '-'
  || upper(substr(md5("id"::text), 5, 4))
WHERE "activationCode" IS NULL;

CREATE UNIQUE INDEX "cards_activationCode_key" ON "cards"("activationCode");
