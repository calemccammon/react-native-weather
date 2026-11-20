import 'maplibre-gl/dist/maplibre-gl.css';

import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import { mapStyleUrl, mapView, type WeatherMapProps } from './WeatherMap.types';

/** How long a press must be held, and how far it may wander, to count. */
const longPressMs = 500;
const longPressSlopPx = 8;

/**
 * The map behind everything else, in a browser. MapLibre's React Native
 * package has no web build, so this drives MapLibre GL JS directly.
 */
export function WeatherMap(props: WeatherMapProps) {
  const { pin, covered, dark, pinColor, pinAccessibilityLabel } = props;
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const style = dark ? mapStyleUrl.dark : mapStyleUrl.light;

  // The newest handler, without making the map again each time it changes.
  const onLongPress = useRef(props.onLongPress);
  useEffect(() => {
    onLongPress.current = props.onLongPress;
  }, [props.onLongPress]);

  // The style the map is first made with; later changes go through setStyle.
  const firstStyle = useRef(style);

  useEffect(() => {
    if (container.current === null) return;
    const created = new maplibregl.Map({
      container: container.current,
      style: firstStyle.current,
      center: [mapView.initialCenter.longitude, mapView.initialCenter.latitude],
      zoom: mapView.initialZoom,
      minZoom: mapView.minZoom,
      maxZoom: mapView.maxZoom,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      // The credit is drawn by the screen, where the forecast cannot cover it.
      attributionControl: false,
    });
    created.touchZoomRotate.disableRotation();
    const stopWatching = watchForLongPress(created, (lngLat) =>
      onLongPress.current(lngLat.lat, lngLat.lng),
    );
    map.current = created;

    return () => {
      stopWatching();
      marker.current = null;
      map.current = null;
      created.remove();
    };
  }, []);

  useEffect(() => {
    if (style !== firstStyle.current || map.current?.isStyleLoaded()) {
      firstStyle.current = style;
      map.current?.setStyle(style);
    }
  }, [style]);

  useEffect(() => {
    marker.current?.remove();
    marker.current = null;
    if (pin === null || map.current === null) return;

    // The default marker is a pin whose tip sits on the point.
    const created = new maplibregl.Marker({ color: pinColor })
      .setLngLat([pin.longitude, pin.latitude])
      .addTo(map.current);
    created.getElement().setAttribute('aria-label', pinAccessibilityLabel);
    marker.current = created;
  }, [pin, pinColor, pinAccessibilityLabel]);

  // Selecting a place, or a change in what covers the map, moves the map so
  // the pin sits in the clear.
  useEffect(() => {
    if (pin === null || map.current === null) return;
    map.current.easeTo({
      center: [pin.longitude, pin.latitude],
      zoom: Math.max(map.current.getZoom(), mapView.placeZoom),
      padding: covered,
      duration: mapView.moveDurationMs,
    });
  }, [pin, covered]);

  return (
    <div
      ref={container}
      role="application"
      aria-label={props.accessibilityLabel}
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}

/**
 * MapLibre GL JS has no long-press event, so one is made from a press that
 * is held in one spot. Returns a function that stops watching.
 */
function watchForLongPress(
  map: maplibregl.Map,
  onLongPress: (lngLat: maplibregl.LngLat) => void,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let start: maplibregl.Point | undefined;

  const cancel = () => {
    clearTimeout(timer);
    start = undefined;
  };
  const begin = (event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
    cancel();
    // A second finger means a pinch, not a press.
    if ('points' in event && event.points.length > 1) return;
    start = event.point;
    timer = setTimeout(() => onLongPress(event.lngLat), longPressMs);
  };
  const moved = (event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
    if (start !== undefined && start.dist(event.point) > longPressSlopPx) cancel();
  };

  map.on('mousedown', begin);
  map.on('touchstart', begin);
  map.on('mousemove', moved);
  map.on('touchmove', moved);
  map.on('mouseup', cancel);
  map.on('touchend', cancel);
  map.on('touchcancel', cancel);
  map.on('movestart', cancel);
  // A held press must not also open the browser's own menu.
  map.on('contextmenu', (event) => event.preventDefault());

  return cancel;
}
