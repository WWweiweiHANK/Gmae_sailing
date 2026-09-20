// One completed encounter, one physical ornament. Unlisted fittings are defaults.
export const accessoryRewards=[
 ['underwater_fish_school','海底鱼群','wave','wave_emblem','海浪徽章'],
 ['dolphin_companion','海豚伴游','dolphin-charm','dolphin_charm','海豚挂件'],
 ['pink_dolphin','粉色来客','pink-dolphin','pink_dolphin_charm','粉色海豚'],
 ['giant_whale_shadow','巨鲸之影','whale-emblem','whale_emblem','鲸鱼徽章'],
 ['massive_bird_migration','迁徙鸟群','gull-emblem','flying_gull_emblem','飞鸟徽章','migration_feather'],
 ['bioluminescent_sea','荧光海','bottle','sea_bottle','漂流瓶','glowing_sea_glass'],
 ['meteor_shower','流星雨','shooting-stars','meteor_star_charm','流星串饰'],
 ['polar_bear_ice','浮冰来客','polar-bear','ice_bear_charm','北极熊摆件'],
 ['fog_lighthouse','雾中灯塔','lantern','fog_lantern','小灯笼','tiny_lighthouse']
].map(([event,eventName,accessory,souvenir,name,legacy])=>({event,eventName,accessory,souvenir,name,legacy}));
