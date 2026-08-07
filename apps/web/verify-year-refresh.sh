#!/bin/bash
if ! grep -A 4 "/years/available" apps/web/src/app/App.tsx | grep -q "}, \[activeModule\]);"; then
  echo "FAIL: activeModule is not in the dependency array of the available years useEffect."
  exit 1
fi
echo "PASS: activeModule added to dependency array."
exit 0
