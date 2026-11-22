'use strict';
// Native SVG masters; Sharp only exports these vectors to raster sizes.
const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const font=require('fontkit').openSync(path.join(root,'public/assets/inter-latin.woff2'));
function outlined(text,x,y,size,color,weight=500,spacing=0,accent=null){
 const face=font.getVariation({wght:weight}),run=face.layout(text),scale=size/face.unitsPerEm;let cursor=x;
 return run.glyphs.map((glyph,i)=>{const p=run.positions[i],fill=accent&&glyph.codePoints.includes(52)?accent:color;const result=`<path fill="${fill}" d="${glyph.path.toSVG()}" transform="translate(${cursor+p.xOffset*scale} ${y-p.yOffset*scale}) scale(${scale} ${-scale})"/>`;cursor+=p.xAdvance*scale+spacing;return result;}).join('');
}
const palette={ink:'#161819',surface:'#202223',paper:'#f0f3f1',mint:'#9ce6c5',muted:'#a6aeaa',line:'#343a37'};
const mark=(color=palette.paper,accent=palette.mint)=>`<path d="M58 178V91c0-26 29-34 43-9l27 48 27-48c14-25 43-17 43 9v49" fill="none" stroke="${color}" stroke-width="23" stroke-linecap="round" stroke-linejoin="round"/><path d="M198 175v3" stroke="${accent}" stroke-width="23" stroke-linecap="round"/>`;
const svg=(body,view='0 0 256 256')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}"><title>Mate4Mobile</title>${body.replace(/<text ([^>]+)>([^<]+)<\/text>/g,(_,attributes,text)=>{const attr=name=>attributes.match(new RegExp('(?:^| )'+name+'="([^"]+)"'))?.[1];return outlined(text,Number(attr('x')),Number(attr('y')),Number(attr('font-size')),attr('fill'),Number(attr('font-weight')||500),Number(attr('letter-spacing')||0));})}</svg>`;
const icon=svg(`<rect width="256" height="256" fill="${palette.ink}"/>${mark()}`);
const lockup=(dark=false)=>svg(`<g transform="translate(0 0) scale(.44)">${mark(dark?palette.ink:palette.paper,dark?'#367a60':palette.mint)}</g>${outlined('Mate4Mobile',128,75,58,dark?palette.ink:palette.paper,600,-2,dark?'#367a60':palette.mint)}`,'0 0 490 112');
const write=(file,text)=>fs.writeFile(path.join(root,file),text);
async function png(source,file,width,height=width){await sharp(Buffer.from(source)).resize(width,height).png().toFile(path.join(root,file));}
(async()=>{
 await fs.mkdir(path.join(root,'brand/exports'),{recursive:true});
 await fs.mkdir(path.join(root,'brand/fonts'),{recursive:true});
 await fs.copyFile(path.join(root,'public/assets/inter-latin.woff2'),path.join(root,'brand/fonts/inter-latin.woff2'));
 await fs.copyFile(path.join(root,'public/assets/INTER-LICENSE'),path.join(root,'brand/fonts/INTER-LICENSE'));
 await fs.mkdir(path.join(root,'public/assets/vehicles'),{recursive:true});
 await write('brand/mark.svg',svg(mark()));await write('brand/mark-dark.svg',svg(mark(palette.ink,'#367a60')));
 await write('brand/mark-mono.svg',svg(mark('#ffffff','#ffffff')));await write('brand/app-icon.svg',icon);
 await write('brand/wordmark.svg',lockup());await write('brand/wordmark-dark.svg',lockup(true));
 await write('brand/compact.svg',svg(outlined('M4M',0,92,100,palette.paper,600,-6,palette.mint),'0 0 245 120'));
 await write('public/brand-mark.svg',svg(mark()));await write('public/brand-wordmark.svg',lockup());await write('public/favicon.svg',icon);
 for(const size of [16,32,48,180,192,512,1024])await png(icon,`brand/exports/icon-${size}.png`,size);
 await png(svg(mark()),'brand/exports/mark-512.png',512);
 await png(lockup(),'brand/exports/wordmark-light.png',980,224);
 await png(lockup(true),'brand/exports/wordmark-dark.png',980,224);
 for(const [file,size] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180],['icon-512-maskable.png',512]])await png(icon,`public/${file}`,size);
 // PNG-compressed ICO frames, supported by current browsers and Windows.
 const frames=await Promise.all([16,32,48].map(size=>fs.readFile(path.join(root,`brand/exports/icon-${size}.png`))));
 const header=Buffer.alloc(6+16*frames.length);header.writeUInt16LE(1,2);header.writeUInt16LE(frames.length,4);let offset=header.length;
 frames.forEach((bytes,i)=>{let p=6+i*16;header[p]=[16,32,48][i];header[p+1]=header[p];header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(bytes.length,p+8);header.writeUInt32LE(offset,p+12);offset+=bytes.length;});
 await fs.writeFile(path.join(root,'public/favicon.ico'),Buffer.concat([header,...frames]));
 // Centre the large mark on the arch (x=890); its local centre is x=128.
 const heroMarkX=890-128*.9;
 const social=svg(`<rect width="1200" height="630" fill="${palette.ink}"/><path d="M700 650V280Q700 70 890 70t190 210v350" fill="none" stroke="#2c3631" stroke-width="2"/><g transform="translate(60 55) scale(.4)">${mark()}</g><text x="176" y="121" fill="${palette.paper}" font-size="38" font-family="Arial,sans-serif" font-weight="600">Mate4Mobile</text><text x="68" y="320" fill="${palette.paper}" font-size="90" font-family="Arial,sans-serif" letter-spacing="-4">Every mile,</text><text x="68" y="420" fill="${palette.mint}" font-size="90" font-family="Arial,sans-serif" letter-spacing="-4">in view.</text><text x="72" y="553" fill="${palette.muted}" font-size="27" font-family="Arial,sans-serif">Your private TeslaMate companion.</text><g transform="translate(${heroMarkX} 225) scale(.9)">${mark()}</g>`,'0 0 1200 630');
 await write('brand/social-card.svg',social);await png(social,'brand/exports/social-card.png',1200,630);
 await write('brand/tokens.json',JSON.stringify({name:'Mate4Mobile',tagline:'Every mile, in view.',colors:palette,typography:{family:'Inter',fallback:'system-ui, sans-serif',body:16,label:14,displayWeight:500},motion:{fast:140,standard:240,enter:420,easing:'cubic-bezier(.22,1,.36,1)',respectReducedMotion:true},radius:{control:6,panel:18},spacing:[4,8,12,16,24,32,48,64,96]},null,2)+'\n');
 await write('brand/tokens.css',`:root{--m4m-ink:${palette.ink};--m4m-surface:${palette.surface};--m4m-paper:${palette.paper};--m4m-mint:${palette.mint};--m4m-muted:${palette.muted};--m4m-line:${palette.line};--m4m-ease:cubic-bezier(.22,1,.36,1);--m4m-font:Inter,system-ui,sans-serif}\n`);
 console.log('Exported Mate4Mobile brand kit and PWA icons; vehicle renders preserved.');
})().catch(error=>{console.error(error);process.exitCode=1;});
