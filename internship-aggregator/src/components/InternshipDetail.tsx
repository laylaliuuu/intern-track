'use client';

import { useState, useEffect } from 'react';
import { 
  ExternalLink, 
  MapPin, 
  Calendar, 
  Clock, 
  Building2,
  User,
  Briefcase,
  DollarSign,
  BookmarkIcon,
  Share2,
  X,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Star,
  Users,
  GraduationCap,
  Target
} from 'lucide-react';
import { Internship } from '@/types';
import { useInternship } from '@/hooks/use-internships';
// Removed import for deleted hook

interface InternshipDetailProps {
  internshipId?: string;
  internship?: Internship;
  isOpen: boolean;
  onClose: () => void;
  onApply?: (internship: Internship) => void;
  className?: string;
}

// Helper functions
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

function formatDeadline(dateString?: string): { text: string; isUrgent: boolean; daysLeft: number } | null {
  if (!dateString) return null;
  
  const deadline = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let text: string;
  let isUrgent = false;
  
  if (diffInDays < 0) {
    text = 'Expired';
    isUrgent = true;
  } else if (diffInDays === 0) {
    text = 'Today';
    isUrgent = true;
  } else if (diffInDays === 1) {
    text = 'Tomorrow';
    isUrgent = true;
  } else if (diffInDays <= 7) {
    text = `${diffInDays} days left`;
    isUrgent = true;
  } else {
    text = deadline.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: deadline.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }
  
  return { text, isUrgent, daysLeft: diffInDays };
}

function extractSkillsFromDescription(description: string): string[] {
  const skillPatterns = [
    /\b(?:JavaScript|TypeScript|Python|Java|C\+\+|React|Node\.js|SQL|AWS|Docker|Kubernetes|Git)\b/gi,
    /\b(?:Machine Learning|Data Science|AI|Analytics|Statistics|Excel|Tableau|PowerBI)\b/gi,
    /\b(?:Product Management|Strategy|Marketing|Business Analysis|Consulting)\b/gi,
    /\b(?:UI|UX|Design|Figma|Sketch|Adobe|Photoshop|Illustrator)\b/gi
  ];
  
  const skills = new Set<string>();
  skillPatterns.forEach(pattern => {
    const matches = description.match(pattern);
    if (matches) {
      matches.forEach(match => skills.add(match));
    }
  });
  
  return Array.from(skills).slice(0, 8); // Limit to 8 skills
}

export default function InternshipDetail({
  internshipId,
  internship: propInternship,
  isOpen,
  onClose,
  onApply,
  className = ''
}: InternshipDetailProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Fetch internship data if only ID is provided
  const { data: fetchedData, isLoading, isError } = useInternship(internshipId || '');
  const internship = propInternship || fetchedData?.data;

  // Bookmark mutation
  // Removed bookmark functionality

  useEffect(() => {
    if (internship) {
      setIsBookmarked(internship.isBookmarked || false);
    }
  }, [internship]);

  const handleBookmark = async () => {
    if (!internship) return;
    
    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState);
    
    try {
      await bookmarkMutation.mutateAsync({
        internshipId: internship.id,
        isBookmarked: newBookmarkState
      });
    } catch (error) {
      // Revert on error
      setIsBookmarked(!newBookmarkState);
    }
  };

  const handleShare = async () => {
    if (!internship) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: internship.title,
          text: `Check out this internship at ${internship.company.name}`,
          url: window.location.href
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleApply = () => {
    if (internship && onApply) {
      onApply(internship);
    }
    // Open application URL
    if (internship?.applicationUrl) {
      window.open(internship.applicationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${className}`}>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="animate-pulse p-6">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !internship) {
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${className}`}>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Failed to load internship
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                The internship details could not be loaded. Please try again.
              </p>
              <button
                onClick={onClose}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const deadline = formatDeadline(internship.applicationDeadline);
  const skills = extractSkillsFromDescription(internship.description);
  const descriptionPreview = internship.description.slice(0, 300);
  const hasLongDescription = internship.description.length > 300;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${className}`}>
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={onClose} />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-lg font-medium text-white">
                  {internship.company.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{internship.title}</h2>
                <p className="text-sm text-gray-600">{internship.company.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-full transition-colors ${
                  isBookmarked 
                    ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                <BookmarkIcon className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
              
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                aria-label="Share internship"
              >
                <Share2 className="h-5 w-5" />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="p-6">
              {/* Key Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-500">Role</span>
                      <div className="font-medium">{internship.normalizedRole}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-500">Location</span>
                      <div className="font-medium">
                        {internship.isRemote ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-green-100 text-green-800">
                            Remote
                          </span>
                        ) : (
                          internship.location
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-500">Work Type</span>
                      <div className="font-medium">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm ${
                          internship.workType === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {internship.workType.charAt(0).toUpperCase() + internship.workType.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-500">Posted</span>
                      <div className="font-medium">{formatTimeAgo(internship.postedAt)}</div>
                    </div>
                  </div>
                  
                  {deadline && (
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-500">Application Deadline</span>
                        <div className={`font-medium ${deadline.isUrgent ? 'text-red-600' : 'text-gray-900'}`}>
                          {deadline.text}
                          {deadline.isUrgent && deadline.daysLeft >= 0 && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                              Urgent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {internship.eligibilityYear && internship.eligibilityYear.length > 0 && (
                    <div className="flex items-center space-x-3">
                      <GraduationCap className="h-5 w-5 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-500">Eligibility</span>
                        <div className="font-medium">
                          {internship.eligibilityYear.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Program Badge */}
              {internship.isProgramSpecific && (
                <div className="mb-6">
                  <div className="inline-flex items-center px-3 py-2 rounded-lg bg-purple-100 text-purple-800">
                    <Star className="h-4 w-4 mr-2" />
                    <span className="font-medium">Special Program</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    This is a special diversity or inclusion program with unique benefits and opportunities.
                  </p>
                </div>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Skills & Technologies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
                <div className="prose prose-sm max-w-none">
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {showFullDescription || !hasLongDescription 
                      ? internship.description 
                      : `${descriptionPreview}...`
                    }
                  </div>
                  {hasLongDescription && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="mt-2 text-blue-600 hover:text-blue-800 font-medium flex items-center"
                    >
                      {showFullDescription ? 'Show less' : 'Show more'}
                      <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${
                        showFullDescription ? 'rotate-90' : ''
                      }`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Source Information */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Source Information</h4>
                <div className="text-sm text-gray-600">
                  <p>Found via: {internship.source.name}</p>
                  <p>Original URL: <a href={internship.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">View original posting</a></p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {deadline && deadline.daysLeft >= 0 && (
                  <span className={deadline.isUrgent ? 'text-red-600 font-medium' : ''}>
                    {deadline.daysLeft === 0 ? 'Application due today' : 
                     deadline.daysLeft === 1 ? 'Application due tomorrow' :
                     `${deadline.daysLeft} days to apply`}
                  </span>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleApply}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  Apply Now
                  <ExternalLink className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}