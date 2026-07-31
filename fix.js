const fs = require('fs');
const path = require('path');

const featuresDir = path.join(__dirname, 'apps/web/src/features');
const appFile = path.join(__dirname, 'apps/web/src/app/App.tsx');

// 1. Fix Modules
const modules = fs.readdirSync(featuresDir);
modules.forEach(modDir => {
  const modPath = path.join(featuresDir, modDir);
  if (!fs.statSync(modPath).isDirectory()) return;
  const files = fs.readdirSync(modPath).filter(f => f.endsWith('Module.tsx'));
  files.forEach(file => {
    const filePath = path.join(modPath, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add showToast to props
    if (content.includes('onExport: (l: string) => void }')) {
      content = content.replace('onExport: (l: string) => void }', 'onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }');
    }
    
    // Fix onExport call
    content = content.replace(/onExport\("([^"]+)"\)/g, 'onExport("$1", items)');
    
    // Fix handleAdd try/catch
    content = content.replace(/await apiClient\.post\([^)]+\);\s*fetchData\(\);\s*}\s*catch\s*\(e\)\s*\{\s*console\.error\(e\);\s*\}/g, 
      (match) => match.replace('fetchData();', 'fetchData();\n      showToast("Data berhasil ditambahkan", "success");').replace('console.error(e);', 'console.error(e);\n      showToast("Gagal menyimpan data", "error");'));
      
    // Fix handleEdit try/catch
    content = content.replace(/await apiClient\.put\([^)]+\);\s*fetchData\(\);\s*}\s*catch\s*\(e\)\s*\{\s*console\.error\(e\);\s*\}/g, 
      (match) => match.replace('fetchData();', 'fetchData();\n      showToast("Data berhasil diperbarui", "success");').replace('console.error(e);', 'console.error(e);\n      showToast("Gagal memperbarui data", "error");'));
      
    // Fix handleDelete try/catch
    content = content.replace(/await apiClient\.delete\([^)]+\);\s*fetchData\(\);\s*}\s*catch\s*\(e\)\s*\{\s*console\.error\(e\);\s*\}/g, 
      (match) => match.replace('fetchData();', 'fetchData();\n      showToast("Data berhasil dihapus", "success");').replace('console.error(e);', 'console.error(e);\n      showToast("Gagal menghapus data", "error");'));
      
    fs.writeFileSync(filePath, content);
  });
});

// 2. Fix App.tsx
let appContent = fs.readFileSync(appFile, 'utf8');

// Add import
if (!appContent.includes('import { apiClient }')) {
  appContent = appContent.replace('import {', 'import { apiClient } from "../lib/apiClient";\nimport {');
}

// Fix export
appContent = appContent.replace(
  /const handleExport = useCallback\(\(label: string\) => \{[^}]+\}, \[showToast\]\);/s,
  `const handleExport = useCallback((label: string, data: any[]) => {
    if (!data || data.length === 0) {
      showToast(\`Tidak ada data untuk diexport\`, "error");
      return;
    }
    const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== "object");
    const header = keys.join(",");
    const rows = data.map(obj => keys.map(k => \`"\${String(obj[k] || "").replace(/"/g, '""')}"\`).join(","));
    const csv = [header, ...rows].join("\\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = \`\${label}.csv\`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(\`"\${label}.csv" berhasil diunduh\`, "success");
  }, [showToast]);`
);

// Fix initial states
appContent = appContent.replace(/useState<DailyActivity\[\]>\(SEED_DAILY\)/g, 'useState<DailyActivity[]>([])');
appContent = appContent.replace(/useState<Stakeholder\[\]>\(SEED_STAKEHOLDERS\)/g, 'useState<Stakeholder[]>([])');
appContent = appContent.replace(/useState<TopIssue\[\]>\(SEED_ISSUES\)/g, 'useState<TopIssue[]>([])');
appContent = appContent.replace(/useState<Proposal\[\]>\(SEED_PROPOSALS\)/g, 'useState<Proposal[]>([])');
appContent = appContent.replace(/useState<CsrProject\[\]>\(SEED_CSR\)/g, 'useState<CsrProject[]>([])');
appContent = appContent.replace(/useState<Grievance\[\]>\(SEED_GRIEVANCES\)/g, 'useState<Grievance[]>([])');
appContent = appContent.replace(/useState<LrpProgram\[\]>\(SEED_LRP\)/g, 'useState<LrpProgram[]>([])');

// Add useEffect
if (!appContent.includes('apiClient.get(\'/daily-activities\')')) {
  appContent = appContent.replace(
    'const showToast = useCallback',
    `useEffect(() => {
    if (activeModule === "dashboard") {
      Promise.all([
        apiClient.get('/daily-activities').catch(() => ({ data: { data: [] } })),
        apiClient.get('/stakeholders').catch(() => ({ data: { data: [] } })),
        apiClient.get('/top-issues').catch(() => ({ data: { data: [] } })),
        apiClient.get('/proposals').catch(() => ({ data: { data: [] } })),
        apiClient.get('/csr-projects').catch(() => ({ data: { data: [] } })),
        apiClient.get('/grievance').catch(() => ({ data: { data: [] } })),
        apiClient.get('/lrp').catch(() => ({ data: { data: [] } }))
      ]).then(([d, s, i, p, c, g, l]) => {
        setDaily(d.data.data || []);
        setStakeholders(s.data.data || []);
        setIssues(i.data.data || []);
        setProposals(p.data.data || []);
        setCsr(c.data.data || []);
        setGrievances(g.data.data || []);
        setLrp(l.data.data || []);
      });
    }
  }, [activeModule]);

  const showToast = useCallback`
  );
}

// Add showToast prop
appContent = appContent.replace(/onExport={handleExport} \/>/g, 'onExport={handleExport} showToast={showToast} />');
appContent = appContent.replace(/StakeholdersModule \/>/g, 'StakeholdersModule showToast={showToast} />');
appContent = appContent.replace(/LrpModule \/>/g, 'LrpModule showToast={showToast} />');

fs.writeFileSync(appFile, appContent);
console.log("Done");
