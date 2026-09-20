const drawings={
 underwater_fish_school:'M5 17q9-10 18 0-9 10-18 0m18 0 6-5v10zM10 10q5-4 10-1M8 25q5 3 11 0',
 dolphin_companion:'M3 24q3-17 19-12l7 5-7 1q-9-4-12 6l-4 5-1-5zm10-11 3-7 4 6m-6 8 2 6 4-8',
 pink_dolphin:'M3 24q3-17 19-12l7 5-7 1q-9-4-12 6l-4 5-1-5zm10-11 3-7 4 6m-6 8 2 6 4-8',
 giant_whale_shadow:'M3 20q11-12 27 0M7 23q10-6 18 0M5 28h22',
 giant_whale_surface:'M16 28V17Q5 19 3 8q10-1 13 7Q21 5 30 8q-1 11-14 9M4 28q6-3 12 0t12 0',
 massive_bird_migration:'M2 13q5-5 10 0 4-5 9 0M11 22q5-5 10 0 4-5 9 0M18 7q3-3 6 0 3-3 6 0',
 bioluminescent_sea:'M2 18q5-4 10 0t10 0t10 0M2 25q5-4 10 0t10 0t10 0M10 4v7m-3-3h6M23 8v6m-3-3h6',
 meteor_shower:'M23 4 9 18m18-8L14 23M8 21l1 3 3 1-3 1-1 3-1-3-3-1 3-1zm13-3-3 3',
 polar_bear_ice:'M3 25l9-5 15 2 4 5-14 4zm6-5v-7l4-5 9 2 4 5v7M13 9l-2-4 5 1m6 5 4-4 1 6M14 20v-5m8 6v-5',
 fog_lighthouse:'M11 28l3-17h7l3 17M12 11V7l5-4 6 4v4zm3 7h6M4 9H1m29 0h-5M3 29h27',
 quiet_day:'M3 22q5-4 10 0t10 0t8 0M6 28q5-4 10 0t10 0M10 15a7 7 0 0 1 14 0M17 2v3M5 7l3 3m18 0 3-3'
};
export function illustration(id,pathData=null){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 34 34');svg.classList.add('journal-illustration');svg.setAttribute('aria-hidden','true');
 for(const data of (pathData??drawings[id]??drawings.quiet_day).split(/(?=M)/)){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',data);svg.append(path);}return svg;
}
export const sketches={whale:drawings.giant_whale_surface,feather:'M8 29Q5 8 27 4Q28 25 8 29M8 29 23 9M12 22l10-2M15 16l8-2',light:drawings.fog_lighthouse,meteor:drawings.meteor_shower,ice:'M17 3v28M5 10l24 14M5 24l24-14M13 5l4 4 4-4M13 29l4-4 4 4',wave:drawings.quiet_day,dolphin:drawings.pink_dolphin};
