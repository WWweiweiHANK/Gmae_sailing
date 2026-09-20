# 基础船单件装配审图 v01

- 日期：2026-09-20。状态：EXPLORE，全部待用户逐项判断；不是游戏实拍，也未设为 MASTER。
- 用户要求：先在基础船上生成每件饰品的放置效果，由用户判断位置、比例和朝向，再继续模型修改。
- 使用内置 image_gen，以 `boat-concepts.png` 中经典款和 `../../assets/boat-accessories.png` 为参考，共生成 4 张九宫格、36 项装配候选。
- A1–A9：挂件；B1–B9：徽章；C1–C9：甲板摆件；D1–D9：组件。已有空白铭牌保留，未新加铭牌款式。
- 本批次只保存审图资料，不据此继续改运行时代码、打包或发布。此前一轮模型重建仍在工作区，待审，不因本次生成自动认定已获视觉认可。
- 已目视检查：36 项均展示装到船上的效果。生成图把原经典款上层船舱简化了，组间船舱细节也略有差异；并非严格复用同一个三维网格。A 组部分挂件接近龙骨底；D3 灯塔样式偏灯笼；D9 在较低的后侧顶板。以上均保持待审，不作为确定尺寸或安装位。

## 图片

- [挂件 · 单件装船审图](boat-placement-charms-v01.png)
- [徽章 · 单件装船审图](boat-placement-emblems-v01.png)
- [甲板摆件 · 单件装船审图](boat-placement-deck-v01.png)
- [组件 · 单件装船审图](boat-placement-parts-v01.png)

## 完整提示词

### 公共约束

```text
Use case: stylized-concept. Generate a high resolution landscape 3x3 REVIEW CONTACT SHEET for a game's accessory placement, exactly NINE panels. Input 1 supplies the BASE BOAT: use ONLY its top-left number 1 CLASSIC boat. Input 2 supplies accessory designs; match them faithfully. All nine panels MUST show the identical whole classic boat at the same large scale, same front-left three-quarter camera, bow to LEFT and aft to RIGHT, same lighting. Boat is broad salmon peach faceted hull, deep navy keel, thin green gunwale, cream deck and two cream cabin tiers, muted sage green beveled roofs, orange short stout chimney with navy cap, warm grey rails, pale-blue windows, ivory blank hull nameplate. Cute premium low-poly miniature, matte materials and soft contact shadows. Do NOT change boat silhouette or skin between panels. Each panel changes EXACTLY ONE accessory relative to the baseline. Baseline contains chimney, bare slender cream mast with warm finial, blank ivory nameplate; NO optional hanging charm, NO deck ornament, NO roof ornament, NO mounted lifering/emblem unless requested in the panel. Keep forward deck clearly visible and empty unless specified. No water, sky, scene props, humans, UI or exploded floating pieces.
White/off-white board, quiet pale-blue panel backgrounds, simple legible navy Chinese labels UNDER each boat, unobtrusive title. Fill panels with boat not huge margins. Accessory must be mounted with physical contact at the stated position, plausible scale relative to WHOLE boat, no clipping, no giant isolated accessory covering boat, no miniature boats inside accessories. No extra unrelated accessories. This is a candidate image for the user to judge exact size and placement, NOT an actual game screenshot. Prefer clear distinctive silhouette and accurate consistency over extra ornamentation.
```

### 挂件 · 单件装船审图

```text
Each panel mounts ONE hanging charm at the SAME aft-side railing hook on the visible broadside, to the RIGHT of hull nameplate. Short tan loop/cord: cord drop .04 of hull length L, total hook-to-bottom drop .16L; charm itself .10-.13L large enough to read, above keel, not touching ground. Keep the rest of boat plain. Match these exact nine designs from input2 top-left group. Row-major labels and contents: "A1 海豚挂件" blue dolphin with cream belly, beak, fins and split tail; "A2 粉色海豚" same silhouette pink; "A3 鲸尾吊饰" navy forked whale fluke; "A4 流星串饰" three small gold pink blue stars in a descending cluster; "A5 极光吊饰" faceted elongated cyan mint violet crystal; "A6 漂流瓶" tiny translucent bottle with cork and gold star inside; "A7 贝壳挂件" cream blush ribbed fan shell; "A8 雨云挂件" soft grey cloud with three dangling blue droplets; "A9 小灯笼" dark-framed warm amber lantern. One charm per boat, no other optional accessories. Title "挂件 · 单件装船审图".
```

### 徽章 · 单件装船审图

```text
Each panel mounts ONE small low-relief modeled emblem at the SAME visible MAIN CABIN SIDE center between two windows, replacing the default lifering. Diameter / longest width .11-.13 of hull length L; not giant and must not cover windows. Whole boat identical. No hanging/deck/roof accessories. Match input2 top-right group, row-major exact labels: "B1 救生圈" red ivory segmented thick ring with OPEN hole; "B2 船舵徽章" brown wood wheel and spokes; "B3 鲸鱼徽章" tiny blue whale with cream belly and uplifted tail; "B4 星辰徽章" gold five pointed dimensional star; "B5 黄昏徽章" golden sun partly behind blue horizon on cream base; "B6 飞鸟徽章" white grey flying seagull; "B7 冰晶徽章" pale icy-blue six-arm snowflake; "B8 海浪徽章" layered blue cyan curling wave; "B9 锚徽章" navy anchor. Attached to cabin not floating or printed. Title "徽章 · 单件装船审图".
```

### 甲板摆件 · 单件装船审图

```text
Each panel places ONE ornament on the SAME forward empty cream bow deck (LEFT end), just forward of the cabin, INSIDE railings. Object firmly rests on deck, clear visible deck around it, footprint .12-.15 of hull length L maximum, height .13-.18L maximum, lower than cabin roof, no railing clipping. All ornaments face camera enough to identify. No hanging/roof accessories or cabin emblem. Match input2 bottom-left group. Row-major exact labels: "C1 北极熊摆件" seated cream polar bear on tiny base; "C2 灯塔摆件" red cream striped tapered lighthouse, lantern windows and red conical top; "C3 极光球" faceted transparent globe enclosing mint cyan aurora on small navy base; "C4 发光海瓶" corked bottle gold star within cyan glass; "C5 海鸟摆件" small standing white grey seagull with amber feet; "C6 鲸鱼摆件" blue whale rising on a tiny navy pedestal, visibly attached; "C7 雪景球" transparent globe snowy spruce and wood base; "C8 纪念小旗" small blue triangular pennant on thin pole with cream foot on DECK, keep original main mast unchanged; "C9 行李箱" two small stacked brown travel cases, teal straps, NO extra bird. Title "甲板摆件 · 单件装船审图".
```

### 组件 · 单件装船审图

```text
Nine independent optional components, one per otherwise plain boat. Row-major labels and exact placement:
"D1 特别旗帜": red cloth flag on EXISTING upper-roof front cream mast, no second mast, cloth width .14 hull length L, mast rise .2L.
"D2 烟囱样式": replace ONLY existing aft chimney with reference orange tapered broad rectangular funnel/navy cap, width .13L, chimney top slightly higher than upper roof, attached down to support, NO additional chimney.
"D3 顶部灯塔": reference slender cream decorative light pole, tiny red mount and warm yellow lamp, on upper roof free rear-right zone away from mast and chimney; height .15L.
"D4 遮阳棚": small four-post blue cream striped canopy on forward deck, max footprint .18L by .15L, height .15L; clear cabin and railings.
"D5 彩旗": one string of tiny colored triangular bunting across upper deck from original mast to chimney support, sensible tied endpoints, not airborne, keep above roof and below mast finial.
"D6 船侧浮标": pair of cream elongated fenders with red/teal bands hanging by short cords from visible aft side rail, max drop .17L and above keel, to RIGHT of nameplate.
"D7 小风车": little cream four-bladed windmill with brown foot on free upper roof, overall height .16L and width .14L, physical roof contact, clear mast and chimney.
"D8 甲板躺椅": small pink cream striped wooden deckchair on forward bow deck within railing, length .16L, height .10L, no person.
"D9 绿植箱": small wood rectangular box of distinct pointed green succulent leaves on free upper roof rear-right portion, width .14L and height .10L, no cactus cylinders; clear mast and chimney.
Title "组件 · 单件装船审图". Keep blank ivory nameplate on all boats. Exactly one changed component per panel, no extra accessories.
```

