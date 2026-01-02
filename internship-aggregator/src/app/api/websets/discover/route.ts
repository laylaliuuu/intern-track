import { NextRequest, NextResponse } from 'next/server';
import { companyDiscoveryPipeline } from '@/services/company-discovery-pipeline';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      maxCompanies = 100,
      minConfidenceScore = 0.6,
      sources = ['yc', 'funding', 'growth', 'tech_stack', 'hiring_signal']
    } = body;

    const metrics = await companyDiscoveryPipeline.runDiscovery({
      maxCompanies,
      minConfidenceScore,
      sources
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error running company discovery:', error);
    return NextResponse.json(
      { error: 'Failed to run company discovery' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const stats = await companyDiscoveryPipeline.getDiscoveryStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching discovery stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discovery stats' },
      { status: 500 }
    );
  }
}