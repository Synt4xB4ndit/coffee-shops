'use client';

import { useState } from 'react';

interface CoffeeShop {
  id: number;
  lat: number;
  lon: number;
  name?: string;
  distance: number;
}

export default function Home() {
  const [coffeeShops, setCoffeeShops] = useState<CoffeeShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);
    setCoffeeShops([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLocation({ lat, lon });

        try {
          const response = await fetch('/api/coffee-shops', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lon }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.details || data.error || 'Failed to fetch coffee shops'
            );
          }

          const shops: CoffeeShop[] = (data.elements || []).map(
            (element: {
              id: number;
              lat: number;
              lon: number;
              tags?: { name?: string };
            }) => ({
              id: element.id,
              lat: element.lat,
              lon: element.lon,
              name: element.tags?.name || 'Unknown Cafe',
              distance: calculateDistance(lat, lon, element.lat, element.lon),
            })
          );

          const sorted = shops
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 8);

          setCoffeeShops(sorted);
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Failed to fetch coffee shops';
          setError(message);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setError('Unable to retrieve your location. Please allow location access.');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="min-h-screen bg-violet-800 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-6 text-white">Coffee Shop Finder</h1>

      <button
        onClick={handleGetLocation}
        disabled={loading}
        className="bg-yellow-950 text-white px-6 py-3 rounded hover:bg-blue-600 mb-6 disabled:opacity-50"
      >
        {loading ? 'Finding coffee shops...' : 'Get My Location'}
      </button>

      {error && <p className="text-red-300 mb-4">{error}</p>}

      {location && !loading && coffeeShops.length === 0 && !error && (
        <p className="text-white">No coffee shops found within 20 miles</p>
      )}

      {coffeeShops.length > 0 && (
        <ul className="space-y-4 w-full max-w-md">
          {coffeeShops.map((shop) => (
            <li key={shop.id} className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold">{shop.name}</h2>
              <p>Distance: {shop.distance.toFixed(2)} km</p>
              <p>
                Coordinates: {shop.lat.toFixed(4)}, {shop.lon.toFixed(4)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}