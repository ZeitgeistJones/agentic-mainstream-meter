import { NextResponse } from 'next/server'
import { fetchJobsLane } from '@/lib/lanes/jobs'

export const revalidate = 3600

export async function GET() {
  const result = await fetchJobsLane()
  return NextResponse.json(result)
}
