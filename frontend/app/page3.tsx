"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { geoApi } from "@/utils/api";
import { useGeolocation } from "@/hooks/useGeolocation";
import { EmptyState } from "@/components/EmptyState";
import type { ZoneCluster } from "@/types";
import AppLayout from "@/components/AppLayout";

declare global {
  interface Window {
    ymaps: any;
  }
}

const YANDEX_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY || "";

const ZONE_COLORS: Record<string, { fill: string; stroke: string }> = {
  close: { fill: "#22c55e", stroke: "#16a34a" },
  near: { fill: "#6b8cff", stroke: "#3451e0" },
  medium: { fill: "#f59e0b", stroke: "#d97706" },
  far: { fill: "#ffffff", stroke: "#9ca3af" },
};

const ZONE_LABELS: Record<string, string> = {
  close: "рядом",
  near: "недалеко",
  medium: "в округе",
  far: "в районе",
};

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const ymapsRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const { lat, lng, loading: geoLoading } = useGeolocation(true);

  const { data: zonesData } = useQuery({
    queryKey: ["zones", lat, lng],
    queryFn: () => geoApi.getZones(lat!, lng!).then((r) => r.data),
    enabled: !!lat && !!lng,
    refetchInterval: 20_000,
  });

  // Load Yandex Maps SDK
  useEffect(() => {
    if (typeof window === "undefined" || !YANDEX_API_KEY) return;
    if (window.ymaps) { setMapReady(true); return; }

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_API_KEY}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      window.ymaps.ready(() => {
        ymapsRef.current = window.ymaps;
        setMapReady(true);
      });
    };
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapReady || !mapRef.current || !lat || !lng) return;
    if (mapInstanceRef.current) return;

    const ymaps = ymapsRef.current || window.ymaps;
    mapInstanceRef.current = new ymaps.Map(mapRef.current, {
      center: [lat, lng],
      zoom: 15,
      controls: [],
    });

    // Dark style
    mapInstanceRef.current.panes.get("ground").getElement().style.filter =
      "invert(0.9) hue-rotate(180deg) brightness(0.8)";
  }, [mapReady, lat, lng]);

  // Draw zone circles
  useEffect(() => {
    if (!mapInstanceRef.current || !zonesData || !lat || !lng) return;

    const ymaps = ymapsRef.current || window.ymaps;
    const map = mapInstanceRef.current;

    // Clear old circles
    map.geoObjects.removeAll();

    // Add user position marker
    const userPlacemark = new ymaps.Placemark(
      [lat, lng],
      {},
      {
        preset: "islands#blueDotIcon",
        iconColor: "#4d6ef5",
      }
    );
    map.geoObjects.add(userPlacemark);

    // Add zone circles (aggregated, no user positions)
    zonesData.zones.forEach((zone: ZoneCluster) => {
      if (zone.user_count === 0) return;

      const colors = ZONE_COLORS[zone.zone_name] || ZONE_COLORS.far;
      const circle = new ymaps.Circle(
        [[lat, lng], zone.radius_meters],
        {
          balloonContent: `${zone.user_count} чел. ${ZONE_LABELS[zone.zone_name] || ""}`,
        },
        {
          fillColor: colors.fill + "15",
          strokeColor: colors.stroke + "60",
          strokeWidth: 1.5,
          strokeStyle: "dash",
        }
      );
      map.geoObjects.add(circle);

      // Count badge at edge
      const label = new ymaps.Placemark(
        [lat + zone.radius_meters / 111320 * 0.7, lng],
        { iconContent: `${zone.user_count}` },
        {
          preset: "islands#blueStretchyIcon",
          iconColor: colors.stroke,
        }
      );
      map.geoObjects.add(label);
    });
  }, [zonesData, lat, lng]);

  if (geoLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full text-white/30">
          Загрузка карты...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="relative h-full">
        {/* Map container */}
        <div ref={mapRef} className="w-full h-full" />

        {/* Zone legend overlay */}
        {zonesData && (
          <div className="absolute bottom-4 left-4 right-4 glass rounded-2xl p-4">
            <p className="text-white/50 text-xs mb-3">Люди рядом</p>
            <div className="grid grid-cols-2 gap-2">
              {zonesData.zones.map((zone) => (
                <div key={zone.zone_name} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: ZONE_COLORS[zone.zone_name]?.stroke || "#888",
                    }}
                  />
                  <span className="text-white/60 text-xs">
                    {zone.radius_meters < 1000
                      ? `${zone.radius_meters}м`
                      : `${zone.radius_meters / 1000}км`}{" "}
                    — {zone.user_count} чел.
                  </span>
                </div>
              ))}
            </div>

            {!YANDEX_API_KEY && (
              <p className="text-amber-400 text-xs mt-2">
                ⚠ Добавь NEXT_PUBLIC_YANDEX_MAPS_KEY в .env
              </p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
