import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lon } = body;

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return NextResponse.json(
        { error: 'lat and lon are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEOAPIFY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEOAPIFY_API_KEY is not set' },
        { status: 500 }
      );
    }

    // Search for cafes within 1500 meters
    const url = new URL('https://api.geoapify.com/v2/places');
    url.searchParams.set('categories', 'catering.cafe');
    url.searchParams.set('filter', `circle:${lon},${lat},32187`);
    url.searchParams.set('bias', `proximity:${lon},${lat}`);
    url.searchParams.set('limit', '10');
    url.searchParams.set('apiKey', apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Geoapify request failed', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalize to the same shape frontend expects
    const elements = (data.features || []).map(
        (feature: {
            properties: {
                place_id: string | number;
                lat: number;
                lon: number;
                name?: string;
                address_line1?: string;
            };
        }) => ({
            id: feature.properties.place_id,
            lat: feature.properties.lat,
            lon: feature.properties.lon,
            tags: {
                name:
                  feature.properties.name ||
                  feature.properties.address_line1 ||
                  'Unkown Cafe'
            },
        })
    );
      

    return NextResponse.json({ elements });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}