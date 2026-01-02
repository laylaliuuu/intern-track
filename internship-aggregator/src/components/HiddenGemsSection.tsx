'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, Star, TrendingUp, Users, BookOpen, Target } from 'lucide-react';
import { HiddenGem } from '@/services/hidden-gems-service';

interface HiddenGemsSectionProps {
  className?: string;
}

export function HiddenGemsSection({ className }: HiddenGemsSectionProps) {
  const [hiddenGems, setHiddenGems] = useState<{
    earlyStage: HiddenGem[];
    highReturnRate: HiddenGem[];
    excellentLearning: HiddenGem[];
    lowCompetition: HiddenGem[];
  }>({
    earlyStage: [],
    highReturnRate: [],
    excellentLearning: [],
    lowCompetition: []
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchHiddenGems();
  }, []);

  const fetchHiddenGems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hidden-gems');
      const data = await response.json();
      setHiddenGems(data);
      
      // Fetch stats
      const statsResponse = await fetch('/api/hidden-gems/stats');
      const statsData = await statsResponse.json();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching hidden gems:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGemTypeIcon = (type: string) => {
    switch (type) {
      case 'early_stage':
        return <TrendingUp className="h-4 w-4" />;
      case 'high_return_rate':
        return <Target className="h-4 w-4" />;
      case 'excellent_learning':
        return <BookOpen className="h-4 w-4" />;
      case 'low_competition':
        return <Users className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getGemTypeColor = (type: string) => {
    switch (type) {
      case 'early_stage':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'high_return_rate':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'excellent_learning':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'low_competition':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGemTypeTitle = (type: string) => {
    switch (type) {
      case 'early_stage':
        return 'Early-Stage Startups';
      case 'high_return_rate':
        return 'High Return Rate Programs';
      case 'excellent_learning':
        return 'Excellent Learning Opportunities';
      case 'low_competition':
        return 'Low Competition Gems';
      default:
        return 'Hidden Gems';
    }
  };

  const getGemTypeDescription = (type: string) => {
    switch (type) {
      case 'early_stage':
        return 'Startups with strong backing and high growth potential';
      case 'high_return_rate':
        return 'Programs known for offering return offers to interns';
      case 'excellent_learning':
        return 'Companies with exceptional mentorship and learning environments';
      case 'low_competition':
        return 'Less-known companies with great opportunities and lower competition';
      default:
        return 'Curated opportunities with unique advantages';
    }
  };

  const renderGemCard = (gem: HiddenGem) => (
    <Card key={gem.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {gem.title}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              {gem.company} • {gem.location}
            </CardDescription>
          </div>
          <Badge className={`${getGemTypeColor(gem.gemType)} border`}>
            <div className="flex items-center gap-1">
              {getGemTypeIcon(gem.gemType)}
              <span className="text-xs font-medium">
                {Math.round(gem.gemScore * 100)}%
              </span>
            </div>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {gem.reasoning}
        </p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {gem.signals.slice(0, 3).map((signal, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {signal.replace('-', ' ')}
            </Badge>
          ))}
          {gem.signals.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{gem.signals.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Posted {new Date(gem.postedAt).toLocaleDateString()}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(gem.url, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View
            </Button>
            {gem.applicationUrl && (
              <Button
                size="sm"
                onClick={() => window.open(gem.applicationUrl, '_blank')}
              >
                Apply
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hidden Gems</h2>
          <p className="text-gray-600">Discover non-obvious, high-value opportunities</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hidden Gems</h2>
        <p className="text-gray-600 mb-4">
          Discover non-obvious, high-value opportunities that others might miss
        </p>
        
        {stats && (
          <div className="flex justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>{stats.totalGems} total gems</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>{Math.round(stats.avgGemScore * 100)}% avg score</span>
            </div>
            </div>
          )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="early_stage" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="early_stage" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Early Stage</span>
          </TabsTrigger>
          <TabsTrigger value="high_return_rate" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">High Return</span>
          </TabsTrigger>
          <TabsTrigger value="excellent_learning" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Learning</span>
          </TabsTrigger>
          <TabsTrigger value="low_competition" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Low Competition</span>
          </TabsTrigger>
        </TabsList>

        {Object.entries(hiddenGems).map(([type, gems]) => (
          <TabsContent key={type} value={type} className="mt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {getGemTypeTitle(type)}
              </h3>
              <p className="text-sm text-gray-600">
                {getGemTypeDescription(type)}
              </p>
      </div>

            {gems.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No hidden gems found in this category.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Check back later for new opportunities!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gems.map(renderGemCard)}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Refresh Button */}
      <div className="text-center">
        <Button
          variant="outline"
          onClick={fetchHiddenGems}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Hidden Gems'}
        </Button>
      </div>
    </div>
  );
}