import { NextResponse } from 'next/server'
import { fetchWikipediaLane } from '@/lib/lanes/wikipedia'

export const revalidate = 3600

export async function GET() {
  const result = await fetchWikipediaLane()
  return NextResponse.json(result)
}
