// All times are seconds of VISIBLE, unpaused world time.
export const ENVIRONMENT={
 periods:['day','dusk','night','dawn'],
 periodDuration:{day:[240,480],dusk:[90,150],night:[240,480],dawn:[90,150]},
 weatherDuration:{clear:[180,360],overcast:[100,240],drizzle:[75,150],storm:[30,65]},
 transitions:{clear:{clear:2,overcast:1},overcast:{clear:3,overcast:1,drizzle:1.5},drizzle:{overcast:5,drizzle:2,storm:.45},storm:{drizzle:1}},
 transition:[12,25],stormCooldown:1200,stormWarning:9,auroraChance:.45,auroraDelay:[25,55]
};
