export const COLOR_PARTS={hullColor:'船体',roofColor:'船顶',stripeColor:'装饰线'};
export const colorCatalog=[
 {id:'cream',name:'奶油白',value:'#fffcf2',price:0,defaultUnlocked:true},
 {id:'navy',name:'海军蓝',value:'#284c65',price:0,defaultUnlocked:true},
 {id:'skyBlue',name:'天空蓝',value:'#83bfd6',price:0,defaultUnlocked:true},
 {id:'mint',name:'薄荷绿',value:'#a9d5bd',price:60,defaultUnlocked:false},
 {id:'coral',name:'珊瑚橙',value:'#e99a7f',price:100,defaultUnlocked:false},
 {id:'yellow',name:'淡黄色',value:'#eddb9b',price:80,defaultUnlocked:false},
 {id:'slate',name:'灰蓝',value:'#829ba8',price:120,defaultUnlocked:false},
 {id:'forest',name:'墨绿色',value:'#42685f',price:160,defaultUnlocked:false}
].map(color=>({...color,category:['hull','roof','stripe']}));
export function ownedColorIds(ids){return colorCatalog.filter(color=>color.defaultUnlocked||(Array.isArray(ids)&&ids.includes(color.id))).map(color=>color.id);}
