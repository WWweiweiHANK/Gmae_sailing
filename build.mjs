import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
const result = await build({entryPoints:['main.js'],bundle:true,minify:true,format:'iife',write:false,legalComments:'inline',loader:{'.mp3':'dataurl'}});
const template = await readFile('template.html','utf8');
const license = await readFile('THREE-LICENSE.txt','utf8');
const output=template.replace('/* SCENE_BUNDLE */', () => result.outputFiles[0].text.replaceAll('</script','<\\/script'));
await writeFile('dist/index.html',(output+'\n<!-- Three.js license\n'+license+'\n-->\n').replace(/[\t ]+$/gm,''));
console.log('Built standalone dist/index.html — all JavaScript bundled, no CDN required.');
