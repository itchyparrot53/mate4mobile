'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist/site');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 await fs.copyFile(path.join(root,'LEGAL.md'),path.join(out,'LEGAL.md'));
 await fs.copyFile(path.join(root,'THIRD_PARTY_NOTICES.md'),path.join(out,'THIRD_PARTY_NOTICES.md'));
 await fs.copyFile(path.join(root,'VEHICLE-ASSETS.json'),path.join(out,'VEHICLE-ASSETS.json'));
 for(const file of ['index.html','style.css','site.js'])await fs.copyFile(path.join(root,'site',file),path.join(out,file));
 await fs.mkdir(path.join(out,'assets'),{recursive:true});
 for(const [src,dest] of [['brand/wordmark.svg','wordmark.svg'],['brand/mark.svg','mark.svg'],['public/favicon.svg','favicon.svg'],['brand/exports/social-card.png','social-card.png'],['public/assets/inter-latin.woff2','inter-latin.woff2'],['public/assets/INTER-LICENSE','INTER-LICENSE']])await fs.copyFile(path.join(root,src),path.join(out,'assets',dest));
 await fs.cp(path.join(root,'brand'),path.join(out,'brand'),{recursive:true});
 await fs.cp(path.join(root,'public'),path.join(out,'demo'),{recursive:true});
 // The demo is an isolated build artifact. Runtime source has no demo bypass.
 async function rewrite(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='vendor')await rewrite(file);continue;}if(!/\.(html|js|css|webmanifest)$/.test(file)||entry.name==='sw.js')continue;
  let text=await fs.readFile(file,'utf8');
  text=text.replace(/(["'`])\/(?=(?:api|assets|vendor)\/|[a-z0-9-]+\.(?:js|css|png|svg|ico|webmanifest))/g,'$1./');
  if(entry.name==='index.html')text=text.replace('<script src="./vehicle-catalog.js"','<script src="./demo-data.js"></script>\n  <script src="./vehicle-catalog.js"').replace('Preview · Sample data','Demo · Invented data · No car connected').replace('placeholder="Enter your passphrase"','placeholder="Demo: use any passphrase"').replace('<title>Mate4Mobile</title>','<title>Mate4Mobile · Interactive demo</title>').replace(/<link rel="manifest"[^>]+>/,'');
  if(entry.name==='app.js')text=text.replace("if('serviceWorker'in navigator &&", "if(false && 'serviceWorker'in navigator &&").replace('tm_units','m4m_demo_units').replace('data-action="install"','data-action="install" disabled');
  if(entry.name==='appearance.js')text=text.replace("'tm_appearance'","'m4m_demo_appearance'");
  await fs.writeFile(file,text);
 }}
 await rewrite(path.join(out,'demo'));
 // Do not offer a worker or installable manifest for the public demo.
 await fs.rm(path.join(out,'demo/sw.js'));await fs.rm(path.join(out,'demo/manifest.webmanifest'));
 await fs.copyFile(path.join(root,'site/demo-data.js'),path.join(out,'demo/demo-data.js'));
 await fs.writeFile(path.join(out,'.nojekyll'),'');
 await fs.writeFile(path.join(out,'404.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found · Mate4Mobile</title><body style="background:#161819;color:#f0f3f1;font:18px system-ui;padding:15vh 10vw"><h1>This road ends here.</h1><p>That page could not be found.</p><a style="color:#9ce6c5" href="https://itchyparrot53.github.io/mate4mobile/">Return to Mate4Mobile</a></body></html>');
 console.log('Built dist/site: showcase, brand kit and isolated synthetic app demo.');
})().catch(error=>{console.error(error);process.exitCode=1;});
