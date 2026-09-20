// Offline derivatives of licensed close recordings. Sources and credits: SOUND_CREDITS.md.
import {spawnSync} from 'node:child_process';
const run=args=>{const r=spawnSync('ffmpeg',['-hide_banner',...args],{encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw Error(r.stderr);return r.stderr;};
for(let i=0;i<7;i++){
 const pencil=i<5,duration=pencil?.48+i*.025:i===5?.588:.72;
 const input=['-ss',String(pencil?1.2+i*2.1:0),'-i',`assets/journal/source/${pencil?'pencil-inspectorj':'page-turn-owlstorm'}.mp3`,'-t',String(duration)];
 const filter=`highpass=f=150,lowpass=f=${pencil?3400:2600}${i===6?',atempo=0.82':''},afade=t=in:d=0.025,afade=t=out:st=${duration-.07}:d=0.07`;
 const stats=run([...input,'-af',filter+',volumedetect','-f','null','-']);
 const mean=Number(stats.match(/mean_volume: ([-\d.]+)/)?.[1]),peak=Number(stats.match(/max_volume: ([-\d.]+)/)?.[1]);
 if(!Number.isFinite(mean)||!Number.isFinite(peak))throw Error('Cannot measure recording');
 const gain=Math.min(-25-mean,-10-peak);
 run(['-y',...input,'-af',filter+`,volume=${gain}dB`,'-ar','22050','-ac','1','-c:a','pcm_s16le',`assets/journal/${pencil?'pencil-'+i:i===5?'page':'close'}.wav`]);
 console.log({sample:i,sourceMeanDb:mean,sourcePeakDb:peak,gainDb:gain});
}
