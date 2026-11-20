import { nextStop, sheetStops } from './BottomSheet';

const stops = Object.values(sheetStops);
const { collapsed, resting, expanded } = sheetStops;

describe('where a released sheet comes to rest', () => {
  it('is the nearest stop when it was let go gently', () => {
    expect(nextStop(stops, 0.2, 0)).toBe(collapsed);
    expect(nextStop(stops, 0.25, 0.1)).toBe(resting);
    expect(nextStop(stops, 0.7, -0.1)).toBe(expanded);
  });

  it('is the next stop up after a flick upwards, however short the drag', () => {
    expect(nextStop(stops, resting + 0.01, -1)).toBe(expanded);
    expect(nextStop(stops, collapsed + 0.01, -1)).toBe(resting);
  });

  it('is the next stop down after a flick downwards', () => {
    expect(nextStop(stops, expanded - 0.01, 1)).toBe(resting);
    expect(nextStop(stops, resting - 0.01, 1)).toBe(collapsed);
  });

  it('never goes past the last stop either way', () => {
    expect(nextStop(stops, expanded, -2)).toBe(expanded);
    expect(nextStop(stops, collapsed, 2)).toBe(collapsed);
  });
});
