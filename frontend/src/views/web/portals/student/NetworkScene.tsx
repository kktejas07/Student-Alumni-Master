/**
 * NetworkScene — native stub. The real three.js graph only renders on web
 * (see NetworkScene.web.tsx); native builds never import `three`.
 */
export default function NetworkScene(_props: { intensity?: number }) {
  return null;
}
