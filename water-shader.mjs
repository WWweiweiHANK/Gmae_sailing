// Same wave formula as motion.mjs; sampled on GPU for height and smooth normals.
export const seaVertexGLSL=`
uniform float uSeaTime,uWaveStrength,uRain;
float seaHeightAt(vec2 q){
 float rim=clamp((1.-pow(abs(q.x)/5.8,4.65)-pow(abs(q.y)/4.45,4.65))*4.,0.,1.);
 float edge=rim*rim*(3.-2.*rim),p=q.x*.55+q.y*1.15-uSeaTime*.46;
 return (.075*sin(p)+.012*sin(2.*p-.4)+.026*sin(q.x*1.05-q.y*.55-uSeaTime*.31)+.006*sin(q.x*2.1+q.y*1.8-uSeaTime*.58))*edge*(1.+uRain*.35)*uWaveStrength;
}
`;
