export function route(time) {
  const a = time * Math.PI / 60;
  return { x: 3.25 * Math.sin(a), z: 2.05 * Math.sin(2 * a + 0.45) };
}
export function chooseWeather(state, weather) {
  if (['sunny', 'rainy', 'night'].includes(weather)) state.weather = weather;
}
