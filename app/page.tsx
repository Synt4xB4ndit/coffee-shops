'use client';

import { useState, useEffect } from 'react';

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
  const [isLocationRequested, setIsLocationRequested] = useState(false);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setIsLocationRequested(true);
    setLoading(true);
  };

  useEffect(() => {
    if (!isLocationRequested) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
      },
      () => {
        setError('Unable to retrieve your location');
        setLoading(false);
        setIsLocationRequested(false);
      }
    );
  }, [isLocationRequested]);

  useEffect(() => {
    if (!location) return;

    const fetchCoffeeShops = async () => {
      try {
        const query = `
          [out:json];
          node["amenity"="cafe"](around:5000,${location.lat},${location.lon});
          out body;
        `;
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch coffee shops');
        }

        const data: { elements: Array<{ id: number; lat: number; lon: number; tags: { name?: string } }> } = await response.json();
        const shops: CoffeeShop[] = data.elements.map((element) => {
          const distance = calculateDistance(location.lat, location.lon, element.lat, element.lon);
          return {
            id: element.id,
            lat: element.lat,
            lon: element.lon,
            name: element.tags.name || 'Unknown',
            distance,
          };
        });

        const sortedShops = shops.sort((a, b) => a.distance - b.distance).slice(0, 5);
        setCoffeeShops(sortedShops);
        setLoading(false);
      } catch {
        setError('Failed to fetch coffee shops');
        setLoading(false);
      }
    };

    fetchCoffeeShops();
  }, [location]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <div className="min-h-screen bg-violet-800 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-6">Coffee Shop Finder</h1>
      {!isLocationRequested && (
        <button
          onClick={requestLocation}
          className="bg-yellow-950 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
        >
          Get My Location
        </button>
      )}
      {loading && <p>Loading...</p>}
      {error && <p className="text-violet">Error: {error}</p>}
      {!loading && !error && coffeeShops.length === 0 && location && <p>No coffee shops found nearby.</p>}
      {coffeeShops.length > 0 && (
        <ul className="space-y-4 w-full max-w-md">
          {coffeeShops.map((shop) => (
            <li key={shop.id} className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold">{shop.name}</h2>
              <p>Distance: {shop.distance.toFixed(2)} km</p>
              <p>Coordinates: {shop.lat.toFixed(4)}, {shop.lon.toFixed(4)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
