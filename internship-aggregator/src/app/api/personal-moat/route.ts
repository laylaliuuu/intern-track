// API route for personal moat building
import { NextRequest, NextResponse } from 'next/server';
import { hiddenGemsService } from '@/services/hidden-gems-service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userProfile } = body;

    if (!userId || !userProfile) {
      return NextResponse.json(
        { error: 'userId and userProfile are required' },
        { status: 400 }
      );
    }

    const personalMoat = await hiddenGemsService.buildPersonalMoat(userId, userProfile);

    logger.info('Personal moat built', {
      component: 'api',
      operation: 'build_personal_moat',
      userId,
      userProfile: {
        skillsCount: userProfile.skills?.length || 0,
        interestsCount: userProfile.interests?.length || 0,
        riskTolerance: userProfile.riskTolerance
      },
      moatStats: {
        skillCombinations: personalMoat.skillCombinations.length,
        undersubscribedRoles: personalMoat.undersubscribedRoles.length,
        emergingOpportunities: personalMoat.emergingOpportunities.length,
        recommendations: personalMoat.personalizedRecommendations.length
      }
    });

    return NextResponse.json({
      data: personalMoat
    });

  } catch (error) {
    logger.error('Failed to build personal moat', {
      component: 'api',
      operation: 'build_personal_moat_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to build personal moat' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    // Get user profile from database (placeholder)
    const userProfile = {
      skills: ['javascript', 'python', 'react'],
      interests: ['ai', 'fintech'],
      careerGoals: ['software_engineer', 'product_manager'],
      riskTolerance: 'medium' as const
    };

    const personalMoat = await hiddenGemsService.buildPersonalMoat(userId, userProfile);

    logger.info('Personal moat retrieved', {
      component: 'api',
      operation: 'get_personal_moat',
      userId,
      moatStats: {
        skillCombinations: personalMoat.skillCombinations.length,
        undersubscribedRoles: personalMoat.undersubscribedRoles.length,
        emergingOpportunities: personalMoat.emergingOpportunities.length,
        recommendations: personalMoat.personalizedRecommendations.length
      }
    });

    return NextResponse.json({
      data: personalMoat
    });

  } catch (error) {
    logger.error('Failed to retrieve personal moat', {
      component: 'api',
      operation: 'get_personal_moat_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to retrieve personal moat' },
      { status: 500 }
    );
  }
}
