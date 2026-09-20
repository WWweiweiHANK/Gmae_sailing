import {accessoryRewards} from '../accessory-rewards.mjs';
export const periodNames={day:'白昼',dusk:'黄昏',night:'夜晚',dawn:'晨光'};
export const weatherNames={clear:'晴',overcast:'阴',drizzle:'小雨',storm:'风雨'};
export const souvenirNames={dolphin_charm:'海豚纪念挂件',pink_dolphin_charm:'粉色海豚挂件',whale_tail_charm:'鲸尾纪念挂件',migration_feather:'迁徙的羽毛',glowing_sea_glass:'微光海玻璃',meteor_star_charm:'流星挂件',ice_bear_charm:'浮冰小熊',tiny_lighthouse:'小小灯塔'};
for(const reward of accessoryRewards)if(!souvenirNames[reward.souvenir])souvenirNames[reward.souvenir]=reward.name;
// Each pair is a title and prose. Repeats cycle deliberately so adjacent visits differ.
export const journalTemplateCatalog={
 underwater_fish_school:[['船下的银光','一群银色小鱼从{ship}下方游过。\n\n它们转弯的时候，海水里闪过一阵细碎的光。'],['短暂的同行','小鱼们又经过了船底。\n\n{ship}慢慢向前，它们很快游向了更深的蓝色里。']],
 dolphin_companion:[['同行的一程','有一只海豚跟着{ship}走了一段路。\n\n它几次靠近船边，最后从海面另一侧离开了。'],['熟悉的水花','船边又响起了轻轻的水声。\n\n海豚跃起，落下，陪着{ship}绕过一道弯。']],
 pink_dolphin:[['粉色的来客','今天，{ship}遇见了一只特别的海豚。\n\n它的颜色很浅，在阳光下接近淡粉色。\n\n它跟着船走了很久。'],['它又来了','那只粉色海豚今天再次出现。\n\n这一次，它从{ship}的船头绕了过去。\n\n像一次很轻的招呼。'],['浅粉色的身影','一抹熟悉的粉色浮出海面。\n\n它在{ship}旁边停留了一会儿，又轻快地游远了。']],
 giant_whale_shadow:[['海底的影子','一个巨大的影子从{ship}下经过。\n\n它移动得非常慢。\n\n直到它完全消失以后，海面仍然很安静。'],['深蓝里的轮廓','那个巨大的影子又一次经过。\n\n{ship}的尾流轻轻散开，水下的轮廓渐渐远去。']],
 giant_whale_surface:[['原来是它','那个熟悉的影子再次出现了。\n\n这一次，它浮出了水面。\n\n是一头非常大的鲸鱼。{ship}安静地经过它身旁。'],['又听见它呼吸','那头鲸又浮出了海面。\n\n在{ship}旁边，它缓缓换了一口气，然后潜回深蓝。']],
 massive_bird_migration:[['从海上经过','一大群鸟从{ship}上空飞过。\n\n队伍很长，一直伸向光亮的那一边。\n\n最后一只也消失后，海又安静下来。'],['向着远方','鸟群再次经过这片海。\n\n{ship}慢慢向前，它们在更高的地方，走着自己的航线。']],
 bioluminescent_sea:[['会发光的海','今晚的海不太一样。\n\n{ship}经过以后，每一道水纹都亮了起来。\n\n像有什么微小的生命藏在水里。'],['水纹里的星光','青蓝色的微光又在水里亮起。\n\n{ship}身后，光沿着尾流轻轻散开，又慢慢熄灭。']],
 meteor_shower:[['流星雨','第一颗流星出现以后，天空安静了一会儿。\n\n然后越来越多的光，从夜空里落下来。\n\n{ship}还在慢慢航行。'],['夜空的来信','今夜，又有光划过小小的天空。\n\n{ship}的灯很暖，流星很远。\n\n谁也没有打破这片安静。']],
 polar_bear_ice:[['漂来的客人','一块很小的浮冰从远处漂了过来。\n\n上面有一只北极熊。\n\n它看了{ship}一会儿，然后继续跟着浮冰漂远了。'],['浮冰上的招呼','浮冰上又出现了那位白色的客人。\n\n它安静地望着{ship}，直到海水把彼此带向不同方向。']],
 fog_lighthouse:[['雾里的灯','今晚海面起了雾。\n\n很远的地方，出现了一座灯塔。\n\n它的灯光几次扫过{ship}。后来，灯塔重新消失在雾里。'],['灯光再一次转来','雾中亮起了熟悉的暖光。\n\n{ship}经过时，那座灯塔慢慢转了一圈。\n\n光退回了雾里。']],
 quiet_day:[['安静的一天','今天没有遇到什么特别的事情。\n\n{ship}继续向前，海水轻轻起伏。\n\n这样的一段路，也想好好记下来。'],['慢慢向前','海风很轻，航程也很慢。\n\n没有特别的来客，只有{ship}和一片不断变化的海。']]
};
export function journalText(event){
 if(!Object.hasOwn(journalTemplateCatalog,event.encounterId))return null;const variants=journalTemplateCatalog[event.encounterId];
 const index=event.firstTime?0:variants.length===1?0:1+(Math.max(2,event.seenCount)-2)%(variants.length-1);
 let [title,body]=variants[index];
 if(event.encounterId==='quiet_day')body=event.timeOfDay==='dusk'?'今天没有遇到什么特别的事情。\n\n太阳落下去的时候，整片海都是金色的。\n\n{ship}，慢慢向前。':event.timeOfDay==='night'?'今夜没有特别的来客。\n\n{ship}的灯亮着，星光和水纹都很安静。':body;
 return {title,body:body.replaceAll('{ship}',event.shipName)};
}
