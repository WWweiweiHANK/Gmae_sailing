// Whole-boat presets from the supplied nine-boat reference. All are freely selectable.
export const boatSkinCatalog=[
 {id:'classic',name:'经典款',en:'CLASSIC',description:'双层船舱 · 杏桃船身',form:'classic',width:.68,cabinHeight:.56,upper:.28,hull:'#c88e77',keel:'#213e55',roof:'#b9bf97',cabin:'#fff1cf',chimney:'#ed8045',cap:'#29445e',rail:'#becdd0',stripe:'#416b61'},
 {id:'rounded',name:'圆润款',en:'ROUNDED',description:'圆弧船头 · 雾蓝屋顶',form:'rounded',width:.72,cabinHeight:.68,upper:0,hull:'#7cb4c9',keel:'#365b79',roof:'#88c4da',cabin:'#fff1d0',chimney:'#e4e6df',cap:'#497b9d',rail:'#becdd0',stripe:'#fff0d1'},
 {id:'tall',name:'高层款',en:'TALL',description:'高高船楼 · 草莓珊瑚',form:'classic',width:.69,cabinHeight:.63,upper:.40,hull:'#df9393',keel:'#a95c65',roof:'#f08f94',cabin:'#fff0d2',chimney:'#df7473',cap:'#de6c70',rail:'#c1ced0',stripe:'#f9d9c4'},
 {id:'light',name:'轻盈款',en:'LIGHT',description:'轻巧窄身 · 深海藏蓝',form:'light',width:.60,cabinHeight:.68,upper:0,hull:'#354f6b',keel:'#263b51',roof:'#4b6d90',cabin:'#42617e',chimney:'#8094a0',cap:'#315a7b',rail:'#b7c8cf',stripe:'#d6e2e0'},
 {id:'wide',name:'宽体款',en:'WIDE',description:'宽阔甲板 · 环景驾驶舱',form:'wide',width:.80,cabinHeight:.48,upper:.32,hull:'#73afd4',keel:'#365c80',roof:'#a3d9eb',cabin:'#fff1d3',chimney:'#e9e9df',cap:'#4b7b9e',rail:'#bfd1d7',stripe:'#f4eccb'},
 {id:'speedy',name:'迅捷款',en:'SPEEDY',description:'倾斜驾驶舱 · 森林绿',form:'speedy',width:.65,cabinHeight:.60,upper:0,hull:'#659279',keel:'#3b6550',roof:'#94b78c',cabin:'#fff1d4',chimney:'#c5a172',cap:'#767958',rail:'#c0cbc3',stripe:'#d6dcad'},
 {id:'square',name:'方头款',en:'SQUARE BOW',description:'方方船头 · 柿子橘',form:'square',width:.70,cabinHeight:.63,upper:0,hull:'#eb806b',keel:'#a95148',roof:'#f08078',cabin:'#fff1d1',chimney:'#e79873',cap:'#df6a64',rail:'#b9cbd0',stripe:'#f5dfb6'},
 {id:'explorer',name:'探索款',en:'EXPLORER',description:'探险驾驶舱 · 木棕铜金',form:'explorer',width:.70,cabinHeight:.68,upper:0,hull:'#9b7957',keel:'#454e4f',roof:'#5d6a7a',cabin:'#4d6070',chimney:'#be975e',cap:'#304355',rail:'#d4b47c',stripe:'#c09a61'},
 {id:'gentle',name:'温柔款',en:'GENTLE',description:'柔和弧线 · 香芋浅紫',form:'gentle',width:.72,cabinHeight:.65,upper:0,hull:'#b6a7dc',keel:'#7062aa',roof:'#c9bdee',cabin:'#e8e7ee',chimney:'#ece7ef',cap:'#a499d2',rail:'#b8acd9',stripe:'#faf3df'}
];
export const boatSkin=id=>boatSkinCatalog.find(s=>s.id===id);
export function createBoatSkins({store,customization}){
 return {equip(id){if(!boatSkin(id))return 'invalid';if(!store.commit({shipCustomization:{...customization.data,skinId:id}}))return 'save-failed';customization.update({skinId:id},{save:false});return 'equipped';}};
}
export function skinThumbnail(s){
 const tier=s.upper>0,roofY=tier?20:27,w=s.form==='wide'?89:83;
 return `<svg viewBox="0 0 120 84" aria-hidden="true"><ellipse cx="61" cy="74" rx="46" ry="5" fill="#6e8f9b" opacity=".12"/><path d="M12 50 77 41 109 50 99 69 43 77 18 66Z" fill="${s.keel}"/><path d="M12 48 78 39 109 48 100 63 43 71 17 61Z" fill="${s.hull}"/><path d="M12 48 78 39 109 48 43 59Z" fill="#fff3d9"/><path d="M34 27 73 22 91 30 91 47 54 54 34 44Z" fill="${s.cabin}"/><path d="M34 27 54 34 54 54 34 44Z" fill="#fff0c9"/><path d="M81 11 91 13 91 30 81 29Z" fill="${s.chimney}"/><path d="M79 8 91 9 94 12 83 13 79 11Z" fill="${s.cap}"/><path d="M${tier?40:30} ${roofY} 73 ${roofY-6} ${w+12} ${roofY+2} 54 ${roofY+10}Z" fill="${s.roof}"/>${tier?`<path d="M46 17 71 13 81 17 81 26 57 30 46 26Z" fill="#fff1d3"/><path d="M42 16 70 11 87 16 57 22Z" fill="${s.roof}"/>`:''}<path d="M58 35 68 33 68 41 58 43Zm16-3 11-2v8l-11 3Z" fill="#a5c7d4"/><path d="M37 33 46 36v9l-9-4Z" fill="#8fb4c7"/><path d="M20 44v8m81-10v9M21 46 43 53 103 44M43 53v7" fill="none" stroke="${s.rail}" stroke-width="2"/><circle cx="73" cy="45" r="5" fill="#fff0c9" stroke="#6996b0" stroke-width="2"/><path d="M44 8v15" stroke="${s.rail}" stroke-width="2"/><circle cx="44" cy="7" r="3" fill="#f8da91"/><path d="m51 64 32-5" stroke="#eef1e9" stroke-width="6" stroke-linecap="round"/></svg>`;
}
