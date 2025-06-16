"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';

// Define interfaces for type safety
interface CoffeeShop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance: number;
}

interface Location {
  lat: number;
  lon: number;
}

export default function Home() {
  const [location, setLocation] = useState<Location | null>(null);
  const [coffeeShops, setCoffeeShops] = useState<CoffeeShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (err) => {
          setError('Unable to retrieve location. Please allow location access.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  // Fetch nearby coffee shops using Overpass API
  useEffect(() => {
    if (!location) return;

    const fetchCoffeeShops = async () => {
      try {
        setLoading(true);
        const query = `
          [out:json];
          node
            [amenity=cafe]
            (around:5000,${location.lat},${location.lon});
          out body;
        `;
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query,
        });
        const data = await response.json();

        const shops: CoffeeShop[] = data.elements
          .map((node: any) => ({
            id: node.id.toString(),
            name: node.tags.name || 'Unnamed Coffee Shop',
            lat: node.lat,
            lon: node.lon,
            distance: calculateDistance(
              location.lat,
              location.lon,
              node.lat,
              node.lon
            ),
          }))
          .sort((a: CoffeeShop, b: CoffeeShop) => a.distance - b.distance)
          .slice(0, 5);

        setCoffeeShops(shops);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch coffee shops.');
        setLoading(false);
      }
    };

    fetchCoffeeShops();
  }, [location]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round((R * c) / 1000 * 100) / 100; // Distance in km
  };

  return (
    <div className="min-h-screen bg-violet-700 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-6 text-gray-800">
        Check Out Your Local Coffee Shops
      </h1>

      {!location && (
        <button
          onClick={getUserLocation}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
        >
          Get My Location
        </button>
      )}

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {loading && <p className="text-gray-600 mt-4">Loading...</p>}

      {coffeeShops.length > 0 && (
        <div className="w-full max-w-2xl mt-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            Nearby Coffee Shops
          </h2>
          <ul className="space-y-4">
            {coffeeShops.map((shop) => (
              <li
                key={shop.id}
                className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition"
              >
                <h3 className="text-lg font-medium text-gray-800">
                  {shop.name}
                </h3>
                <p className="text-gray-600">
                  Distance: {shop.distance} km
                </p>
                <p className="text-gray-600">
                  Coordinates: {shop.lat.toFixed(4)}, {shop.lon.toFixed(4)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="mt-8 text-gray-500">
        Powered by{' '}
        <Link href="https://www.openstreetmap.org" className="underline">
          OpenStreetMap
        </Link>
      </footer>
    </div>
  );
}
