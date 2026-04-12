export type WorldCameraClampRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function clampCameraToWorldRect(options: {
  camX: number;
  camY: number;
  zoom: number;
  viewW: number;
  viewH: number;
  rect: WorldCameraClampRect;
}): { camX: number; camY: number } {
  const { zoom: z, viewW, viewH, rect } = options;
  let { camX, camY } = options;
  const minCamX = viewW - rect.right * z;
  const maxCamX = -rect.left * z;
  if (minCamX > maxCamX) {
    camX = (minCamX + maxCamX) / 2;
  } else {
    camX = Math.min(Math.max(camX, minCamX), maxCamX);
  }
  const minCamY = viewH - rect.bottom * z;
  const maxCamY = -rect.top * z;
  if (minCamY > maxCamY) {
    camY = (minCamY + maxCamY) / 2;
  } else {
    camY = Math.min(Math.max(camY, minCamY), maxCamY);
  }
  return { camX, camY };
}
