import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const qa=process.argv.includes('--qa');
const desktop=process.argv.includes('--desktop');
const gm=process.argv.includes('--gm')||process.env.TINY_TIDES_GM==='1';
const outputDir=qa?'qa-preview':desktop?'desktop-dist':'preview';
await mkdir(outputDir,{recursive:true});
const result = await build({entryPoints:['main.js'],define:{__QA__:String(qa),__DEV__:String(!desktop),__GM__:String(gm)},bundle:true,minify:true,format:'iife',write:false,legalComments:'inline',loader:{'.wav':'dataurl','.mp3':'dataurl','.png':'dataurl'}});
const [readJournalCSS,readJournalHTML]=await Promise.all([readFile('journal/journal.css','utf8'),readFile('journal/journal.html','utf8')]);
const template = (await readFile('template.html','utf8')).replace(/<!-- GM_START -->([\s\S]*?)<!-- GM_END -->/,gm?'$1':'')
 .replace(/<script id="template-entry">[\s\S]*?<\/script>\s*/, '')
 .replace('/* JOURNAL_STYLE */',()=>readJournalCSS).replace('<!-- JOURNAL_UI -->',()=>readJournalHTML);
const license = await readFile('THREE-LICENSE.txt','utf8');
const output=template.replace('/* SCENE_BUNDLE */', () => result.outputFiles[0].text.replaceAll('</script','<\\/script'));
await writeFile(`${outputDir}/index.html`,(output+'\n<!-- Three.js license\n'+license+'\n-->\n').replace(/[\t ]+$/gm,''));
console.log(`Built ${outputDir}/index.html — all JavaScript bundled, no CDN required${gm?', GM enabled':', GM disabled'}.`);
