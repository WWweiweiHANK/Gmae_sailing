import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv.includes('--qa')?'qa-preview':'dist');
http.createServer(async(req,res)=>{
 try{const target=new URL(req.url,'http://localhost').pathname;if(target!=='/'&&target!=='/index.html'){res.writeHead(404).end();return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(await readFile(path.join(root,'index.html')));
 }catch{res.writeHead(500).end('Run npm run build first.');}
}).listen(4173,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4173/'));
