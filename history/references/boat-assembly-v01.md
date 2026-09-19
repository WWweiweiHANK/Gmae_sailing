# 小船装配比例参考 v01

- 日期：2026-09-20。
- 状态：EXPLORE，候选建模参考；未设为 MASTER，未替换运行时模型。
- 图片：`boat-assembly-v01.png`。
- 生成方式：内置 image_gen；以 `boat-concepts.png` 的经典款和 `../../assets/boat-accessories.png` 为两张视觉参考。
- 本轮目标：先生成组件实际放到船上的参考效果，再据此重建；船只更饱满，烟囱短粗并有支撑，灯塔/挂件可辨认，旗杆、甲板、烟囱、救生圈、船名牌、挂件、顶板七个区域独立。
- 输出包含同一装配的主视效果、侧视与俯视；辅助视图用于视觉布局，不是严格尺寸校准的工程投影。下列比例是生成时的目标，实际建模仍需按选定参考校准。
- 本轮只交付参考图，前端模型、预览和 EXE 没有改变。

## 最终生成提示词

```text
Use case: stylized-concept.
Create a NEW high quality game-art assembly reference sheet using the TWO supplied images as visual references. Image 1 is the canonical BOAT SILHOUETTE / material / proportion reference (specifically boat 1 CLASSIC, peach hull with two sage-green roof tiers). Image 2 is the ACCESSORY DESIGN reference. Faithfully combine them into a coherent assembled boat. This is a modeling target for a cute low-poly Three.js boat, NOT an illustration of the current crude game mesh. Preserve the recognizability and craftsmanship of both references.

Canvas: landscape, approx 3:2, very high detail. Warm off-white studio board with faint pale blue panels, understated navy Chinese typography. Header exact text “小船装配 · 比例参考”. One LARGE beautiful front-left three-quarter hero boat on left taking about 60% of board, hull bow points left, readable left broadside. On right two smaller consistent views of THE EXACT SAME ASSEMBLY: clean side elevation above, orthographic top plan below, enough size to understand mounting locations. These are three views of ONE vessel, same palette and equipment, no different variants. Boat only with soft ground contact shadow; no ocean, sky, UI, characters, floating accessories or exploded view.

Design fidelity: The classic boat from image1 has a broad plump peach/salmon faceted hull, deep-navy tapered keel, cream open deck and cabin, a thin green gunwale accent, broad shallow sage roof slabs with soft bevels, one main cabin and a smaller low upper wheelhouse. Cream framed pale-blue windows, simple warm-grey continuous railings, navy portholes. Rounded polygonal bow and readable deck space wrapping around the cabin. Reproduce original lovely toy proportions, not a tall narrow box with long sticks. Approx hull length L, beam .50L, hull depth .22L, roof max height above deck .31L. Cabin mass slightly aft of center, open forward deck approx .24L long. Upper wheelhouse is low, not a tower.
Chimney: match original short stout slightly raked/tapered rectangular/octagonal orange funnel with navy broad cap, integrated aft of cabin, supported down to deck with no gap. Exposed chimney width approx .13L, top only slightly above upper roof. NOT a tall thin cylindrical tube.

Install seven clearly defined permanent mount roles, with physically plausible contact, deliberate spacing and crisp silhouettes:
1 旗子: slender cream flag mast on front-left corner of highest roof, warm round finial, one small coral-red waving flag based on image2. Flag cloth width .15L, pole rise about .20L. It must not intersect rooftop ornament or chimney.
2 前甲板: one recognizable red-and-cream striped LIGHTHOUSE souvenir from image2, sitting in empty bow deck on a small cream foot. Height approx .16L, footprint .085L; big enough to read its lantern room and roof, below cabin roof and not crowding railings. Keep substantial visible open cream deck around it.
3 烟囱: stout integrated orange/navy funnel as above in aft reserved location.
4 救生圈: red-and-ivory segmented lifebuoy from image2, centered on visible main cabin side between windows. Outer diameter .115L; a round hole and thick faceted tube, clearly mounted, not a flat icon or printed circle.
5 船名牌: broad ivory rounded-corner nameplate on the lower hull broadside, width .34L, height .065L. Exact boat name “晚风号” in dark navy, clean centered and legible. Does not overlap portholes or charm.
6 挂件: recognizable BLUE DOLPHIN miniature pendant from image2 on a small bronze hook at aft side rail, short tan cord with a neat small loop. Dolphin curved blue back, cream belly, beak, dorsal fin, flippers and split tail all readable. Figurine approx .12L long, total hook-to-bottom drop .17L. Charm is visually meaningful, not a tiny bead on an oversized rope loop. Positioned aft of the nameplate, outside hull side, hangs above keel/waterline, no clipping.
7 顶板: small rectangular WOODEN PLANT BOX from image2 on the free rear-right portion of upper roof, with 4-5 distinct pointed succulent leaves fanning out naturally. Width .13L, height including leaves .105L. NOT vertical cactus cylinders. Leave roof clearance around flag and chimney.

Use selective, generous low-poly facets and beveled silhouette edges, flat matte pastel colors, soft natural studio lighting and subtle ambient contact shadows. Solid modeled shapes; no glossy plastic, photoreal PBR, harsh triangular noise, needle-thin rods, overcomplicated details, huge hanging ropes or pin-sized accessories. Larger silhouettes should match the original references very closely.

Layout details: place tasteful small navy numeric callouts 1-7 with thin leader lines OUTSIDE the large boat, each pointing exactly to its respective part. Include a compact legend with only these exact texts: “1 旗子” “2 前甲板” “3 烟囱” “4 救生圈” “5 船名牌” “6 挂件” “7 顶板”. Label right small panels “侧视” and “俯视”. No extra marketing prose, no fake technical measurements, no logos. Prioritize a beautiful faithful assembly, accessory proportional readability and agreement between views over decorative layout.
```
