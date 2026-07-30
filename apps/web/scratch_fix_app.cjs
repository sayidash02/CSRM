const fs = require('fs');
const path = require('path');

const p = path.resolve('apps/web/src/app/App.tsx');
let content = fs.readFileSync(p, 'utf8');

// The marker where Daily Activities starts
const markerStart = "// ─── Daily Activities ─────────────────────────────────────────────────────────";
const markerEnd = "// ─── Stakeholder ──────────────────────────────────────────────────────────────";

const startIdx = content.indexOf(markerStart);
const endIdx = content.indexOf(markerEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const newContent = content.substring(0, startIdx) + 
    "// ─── Daily Activities ─────────────────────────────────────────────────────────\n\n// DailyActivitiesModule is extracted to features/daily-activities/DailyActivitiesModule.tsx\n\n" + 
    content.substring(endIdx);
  
  fs.writeFileSync(p, newContent, 'utf8');
  console.log("Successfully removed old Daily Activities module from App.tsx");
} else {
  console.log("Could not find markers!");
}
