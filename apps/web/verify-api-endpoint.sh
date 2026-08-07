#!/bin/bash
if grep -q "'/years/available'" apps/web/src/app/App.tsx; then
  echo "FAIL: '/years/available' still exists in App.tsx"
  exit 1
fi
if ! grep -q "apiClient.get('/years')" apps/web/src/app/App.tsx; then
  echo "FAIL: '/years' not found in App.tsx"
  exit 1
fi
echo "PASS: '/years' endpoint is used."
exit 0
