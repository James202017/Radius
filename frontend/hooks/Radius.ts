"use client";
import { useEffect, useRef, useState } from "react";
import { geoApi } from "@/utils/api";

interface GeoState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

const UPDATE_INTERVAL_MS = 15_000; // 15 seconds

export function useGeolocation(enabled = true) {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    loading: true,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined") return;

    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        error: "Геолокация не поддерживается",
        loading: false,
      }));
      return;
    }

    const pushLocation = async (lat: number, lng: number, accuracy: number) => {
      setState({ lat, lng, accuracy, error: null, loading: false });
      try {
        await geoApi.updateLocation(lat, lng, accuracy);
      } catch {
        // Silently fail - will retry on next interval
      }
    };

    const onSuccess = (pos: GeolocationPosition) => {
      pushLocation(
        pos.coords.latitude,
        pos.coords.longitude,
        pos.coords.accuracy
      );
    };

    const onError = (err: GeolocationPositionError) => {
      setState((s) => ({
        ...s,
        error: err.message,
        loading: false,
      }));
    };

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    };

    // Initial position
    navigator.geolocation.getCurrentPosition(onSuccess, onError, geoOptions);

    // Watch for changes
    watchRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      geoOptions
    );

    // Periodic server update (even if position hasn't changed)
    intervalRef.current = setInterval(() => {
      if (state.lat && state.lng) {
        geoApi.updateLocation(state.lat, state.lng, state.accuracy ?? undefined).catch(() => {});
      }
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled]);

  return state;
}
