#!/bin/bash
if grep -q "<select multiple" apps/web/src/features/daily-activities/DailyActivitiesModule.tsx; then
  echo "FAIL: <select multiple> is still present. It should be replaced with the new Pill UI."
  exit 1
fi

if ! grep -q "Belum ada PIC" apps/web/src/features/daily-activities/DailyActivitiesModule.tsx; then
  echo "FAIL: New Pill UI ('Belum ada PIC' empty state) is missing."
  exit 1
fi

echo "PASS: Pill UI implemented and <select multiple> removed."
exit 0
