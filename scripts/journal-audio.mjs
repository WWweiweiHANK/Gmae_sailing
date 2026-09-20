// Original procedural paper/pencil textures, no remote recordings or runtime synthesis.
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('assets/journal',{recursive:true});
let seed=2187;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let sample=0;sample<7;sample++){
 const paper=sample>=5,rate=22050,length=Math.floor(rate*(paper?.34:.15+sample*.025)),buffer=Buffer.alloc(44+length*2);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(length*2,40);let low=0;
 for(let i=0;i<length;i++){const noise=random()*2-1;low=low*(paper?.9:.68)+noise*(paper?.1:.32);const t=i/length,envelope=Math.sin(Math.PI*t)**1.8,grain=.6+.4*Math.sin(i/(80+sample*19));buffer.writeInt16LE(Math.round((paper?low:noise-low*.8)*envelope*grain*3600),44+i*2);}
 await writeFile(`assets/journal/${sample<5?'pencil-'+sample:sample===5?'page':'close'}.wav`,buffer);
}
