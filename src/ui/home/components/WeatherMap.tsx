import { Camera, Map, Marker, type CameraRef, type MapRef } from '@maplibre/maplibre-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-paper';

import { mapStyleUrl, mapView, type WeatherMapProps } from './WeatherMap.types';

/**
 * The map behind everything else, on Android and iOS. A long press picks the
 * point under it. The web has its own version in `WeatherMap.web.tsx`.
 */
export function WeatherMap(props: WeatherMapProps) {
  const { pin, covered } = props;
  const map = useRef<MapRef>(null);
  const camera = useRef<CameraRef>(null);

  // Selecting a place, or a change in what covers the map, moves the map so
  // the pin sits in the clear.
  useEffect(() => {
    if (pin === null) return;
    let cancelled = false;
    void (async () => {
      const zoom = (await map.current?.getZoom()) ?? mapView.initialZoom;
      if (cancelled) return;
      camera.current?.easeTo({
        center: [pin.longitude, pin.latitude],
        zoom: Math.max(zoom, mapView.placeZoom),
        padding: covered,
        duration: mapView.moveDurationMs,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [pin, covered]);

  return (
    <Map
      ref={map}
      style={StyleSheet.absoluteFill}
      mapStyle={props.dark ? mapStyleUrl.dark : mapStyleUrl.light}
      touchRotate={false}
      touchPitch={false}
      compass={false}
      logo={false}
      // The credit is drawn by the screen, where the forecast cannot cover it.
      attribution={false}
      accessibilityLabel={props.accessibilityLabel}
      onLongPress={(event) => {
        const [longitude, latitude] = event.nativeEvent.lngLat;
        props.onLongPress(latitude, longitude);
      }}
    >
      <Camera
        ref={camera}
        initialViewState={{
          center: [mapView.initialCenter.longitude, mapView.initialCenter.latitude],
          zoom: mapView.initialZoom,
        }}
        minZoom={mapView.minZoom}
        maxZoom={mapView.maxZoom}
      />
      {pin !== null && (
        // The pin's tip, not its middle, sits on the point.
        <Marker lngLat={[pin.longitude, pin.latitude]} anchor="bottom">
          <View accessible accessibilityLabel={props.pinAccessibilityLabel}>
            <Icon source="map-marker" size={mapView.pinSize} color={props.pinColor} />
          </View>
        </Marker>
      )}
    </Map>
  );
}
