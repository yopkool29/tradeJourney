-- CreateIndex

DELETE FROM "DayTag"
WHERE id NOT IN (
    SELECT MAX(id)
    FROM "DayTag"
    GROUP BY date
);

CREATE UNIQUE INDEX "DayTag_date_key" ON "DayTag"("date");

