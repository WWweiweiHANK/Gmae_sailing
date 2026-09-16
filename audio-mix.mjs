export function ambientMix(weather){
  if(weather==='storm')return {sea:.52,rain:.65,gull:0};
  if(weather==='rainy')return {sea:.45,rain:.4,gull:0};
  if(weather==='night')return {sea:.32,rain:0,gull:0};
  if(weather==='dusk')return {sea:.4,rain:0,gull:.14};
  return {sea:.5,rain:0,gull:.22};
}
