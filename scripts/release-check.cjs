'use strict';

const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const ignored=new Set(['node_modules','.git','dist','.setup.lock']);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>ignored.has(entry.name)?[]:entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const files=walk(root);let count=0;
for(const file of files){const rel=path.relative(root,file).replaceAll('\\','/');if(rel==='.env'||rel.startsWith('.env.')&&rel!=='.env.example')continue;
 assert.ok(!/\.(pem|key|crt|dump|bak|log)$/.test(rel),`Private artifact: ${rel}`);
 if(!/\.(?:js|cjs|css|html|md|json|yml|sql|sh|webmanifest)$/.test(rel))continue;
 const text=fs.readFileSync(file,'utf8');
 assert.ok(!/-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----/.test(text),`Key material: ${rel}`);
 // Scan for credential assignments; documented placeholders and test inputs are
 // allowed. Generated secrets belong only in the ignored .env, never source.
 assert.ok(!/^(?:APP_PASS|APP_SECRET|PGPASSWORD)=[a-f0-9]{32,}\s*$/m.test(text),`Hardcoded credential: ${rel}`);
 if(rel.endsWith('.sh'))assert.ok(!text.includes('\r'),'Shell script must use LF: '+rel);
 if(rel.endsWith('.md'))for(const match of text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)){
  const target=match[1].split('#')[0];if(!target||/^(?:https?:|mailto:|#)/.test(target))continue;
  assert.ok(fs.existsSync(path.resolve(path.dirname(file),decodeURIComponent(target))),`Broken Markdown link in ${rel}: ${target}`);count++;
 }
}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/manifest.webmanifest')));
assert.equal(manifest.name,'Mate4Mobile');assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/');
for(const icon of manifest.icons){const file=path.join(root,'public',icon.src),bytes=fs.readFileSync(file);assert.equal(bytes.subarray(1,4).toString(),'PNG');const [w,h]=icon.sizes.split('x').map(Number);assert.equal(bytes.readUInt32BE(16),w);assert.equal(bytes.readUInt32BE(20),h);}
assert.ok(manifest.icons.some(i=>i.purpose==='maskable'));
const publicFiles=walk(path.join(root,'public'));assert.ok(publicFiles.every(f=>!f.endsWith('demo-data.js')),'Demo adapter leaked into production');
const prod=fs.readFileSync(path.join(root,'public/app.js'),'utf8');assert.ok(!prod.includes("if(false && 'serviceWorker'"));
const site=path.join(root,'dist/site');assert.ok(fs.existsSync(path.join(site,'index.html')),'Run npm run site first');
const demo=fs.readFileSync(path.join(site,'demo/app.js'),'utf8');assert.ok(demo.includes("if(false && 'serviceWorker'"));assert.ok(!fs.existsSync(path.join(site,'demo/sw.js')));assert.ok(!fs.existsSync(path.join(site,'demo/manifest.webmanifest')));
assert.ok(fs.readFileSync(path.join(site,'demo/money.js'),'utf8').includes("'/kWh'"),'Subpath build must not rewrite measurement units');
for(const file of walk(site)){if(!/\.(html|css)$/.test(file))continue;const text=fs.readFileSync(file,'utf8');
 for(const match of text.matchAll(/(?:\b(?:src|href)=["']|url\(["']?)([^"'\s)<>]+)["')]/g)){
  const target=match[1].split('#')[0].split('?')[0];if(!target||/^(?:https?:|data:|mailto:|#)/.test(target))continue;
  assert.ok(!target.startsWith('/'),`Root-relative Pages path: ${target} in ${file}`);
  let resolved=path.resolve(path.dirname(file),decodeURIComponent(target));if(fs.existsSync(resolved)&&fs.statSync(resolved).isDirectory())resolved=path.join(resolved,'index.html');
  assert.ok(fs.existsSync(resolved),`Missing site asset/link: ${target} in ${path.relative(site,file)}`);count++;
 }
}
assert.ok(fs.existsSync(path.join(root,'docs/legal/LEGAL.md')),'Vehicle rights notice is required');
assert.ok(fs.existsSync(path.join(root,'docs/legal/VEHICLE-ASSETS.json')),'Vehicle provenance is required');
const provenance=JSON.parse(fs.readFileSync(path.join(root,'docs/legal/VEHICLE-ASSETS.json'),'utf8'));
for(const asset of provenance.assets){
 const bytes=fs.readFileSync(path.join(root,'public',asset.src));
 assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),asset.sha256,`Vehicle render changed: ${asset.src}`);
}
console.log(`PASS ${files.length} source files, ${count} local links/assets, PWA sizes, shell/demo isolation and common private-artifact checks.`);
console.log('Review staged files before publication; automated scans are not a complete secret audit.');
