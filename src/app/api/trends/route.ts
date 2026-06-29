import { NextResponse } from 'next/server'
import { fetchTrendsLane } from '@/lib/lanes/trends'

export const revalidate = 3600

export async function GET() {
  const result = await fetchTrendsLane()
  return NextResponse.json(result)
}
