'use client';

interface InternshipData {
  id: string;
  company: string | { name: string; domain?: string };
  companyUrl?: string;
  role: string;
  title?: string;
  location: string;
  postedDate: string;
  postedAt?: string;
  payRate: string;
  workType?: string;
  applicationDeadline: string;
  applicationUrl: string;
  // New quality fields
  graduationYear?: string;
  requirements?: string;
}

interface InternshipTableTemplateProps {
  internships: InternshipData[];
  isLoading?: boolean;
}

export default function InternshipTableTemplate({ internships, isLoading = false }: InternshipTableTemplateProps) {
  // Convert API data to the expected format
  // Helper function to clean job titles
  const cleanJobTitle = (title: string): string => {
    if (!title) return '';
    
    return title
      .replace(/\s*-\s*(summer|fall|spring|winter)\s*202[0-9]/gi, '')
      .replace(/\s*(summer|fall|spring|winter)\s*202[0-9]/gi, '')
      .replace(/\s*\(bs\/ms\)/gi, '')
      .replace(/\s*\(bachelor's\)/gi, '')
      .replace(/\s*\(master's\)/gi, '')
      .replace(/\s*class\s+of\s+202[0-9]/gi, '')
      .replace(/\s*graduating\s+in\s+202[0-9]/gi, '')
      .replace(/🛂\s*/g, '')
      .replace(/📍\s*/g, '')
      .replace(/💰\s*/g, '')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const convertApiData = (apiInternships: any[]): InternshipData[] => {
    return apiInternships.map(internship => {
      // Use new quality fields if available, fallback to legacy fields
      let exactRole = internship.exactRole || internship.title || internship.role;
      
      // Clean the role title
      exactRole = cleanJobTitle(exactRole);
      
      const graduationYear = internship.graduationYear && internship.graduationYear.length > 0 
        ? `Class of ${internship.graduationYear.join('/')}` 
        : '';
      
      // Format pay rate using actual job posting data
      let payRate = 'Not listed';
      if (internship.payRateMin && internship.payRateMax) {
        if (internship.payRateType === 'hourly') {
          payRate = `$${internship.payRateMin}-${internship.payRateMax}/hour`;
        } else if (internship.payRateType === 'salary') {
          payRate = `$${Math.round(internship.payRateMin/1000)}k-${Math.round(internship.payRateMax/1000)}k/year`;
        } else if (internship.payRateType === 'unpaid') {
          payRate = 'Unpaid';
        } else if (internship.payRateType === 'stipend') {
          payRate = `$${internship.payRateMin}-${internship.payRateMax} stipend`;
        }
      } else if (internship.payRateType === 'unknown') {
        payRate = 'Not listed';
      } else if (internship.workType === 'paid') {
        payRate = 'Not listed'; // Don't use industry standards
      }

      // Clean location
      let location = internship.location || 'Not specified';
      if (location && location.length > 50) {
        location = location.substring(0, 50) + '...';
      }

      return {
        id: internship.id,
        company: typeof internship.company === 'object' ? internship.company.name : internship.company,
        companyUrl: typeof internship.company === 'object' ? `https://${internship.company.domain}` : undefined,
        role: exactRole,
        graduationYear: graduationYear,
        location: location,
        postedDate: internship.postedAt ? new Date(internship.postedAt).toLocaleDateString() : internship.postedDate,
        payRate: payRate,
        applicationDeadline: internship.applicationDeadline ? new Date(internship.applicationDeadline).toLocaleDateString() : 'Rolling',
        applicationUrl: internship.applicationUrl,
        requirements: internship.requirements
      };
    });
  };

  const sampleData: InternshipData[] = [
    {
      id: '1',
      company: 'Google',
      companyUrl: 'https://careers.google.com',
      role: 'Software Engineering Intern',
      location: 'Mountain View, CA',
      postedDate: '15/12/2024',
      payRate: '$35/hour',
      applicationDeadline: '15/01/2025',
      applicationUrl: 'https://careers.google.com/jobs/results'
    },
    {
      id: '2',
      company: 'Microsoft',
      companyUrl: 'https://careers.microsoft.com',
      role: 'Data Science Intern',
      location: 'Seattle, WA',
      postedDate: '10/12/2024',
      payRate: '$32/hour',
      applicationDeadline: 'Rolling',
      applicationUrl: 'https://careers.microsoft.com/us/en/search-results'
    },
    {
      id: '3',
      company: 'Apple',
      companyUrl: 'https://jobs.apple.com',
      role: 'Product Management Intern',
      location: 'Cupertino, CA',
      postedDate: '08/12/2024',
      payRate: '$40/hour',
      applicationDeadline: '10/01/2025',
      applicationUrl: 'https://jobs.apple.com/en-us/search'
    },
    {
      id: '4',
      company: 'Meta',
      companyUrl: 'https://careers.meta.com',
      role: 'UX Design Intern',
      location: 'Menlo Park, CA',
      postedDate: '05/12/2024',
      payRate: '$30/hour',
      applicationDeadline: 'Rolling',
      applicationUrl: 'https://careers.meta.com/careers'
    },
    {
      id: '5',
      company: 'Amazon',
      companyUrl: 'https://amazon.jobs',
      role: 'Marketing Intern',
      location: 'Seattle, WA',
      postedDate: '01/12/2024',
      payRate: '$28/hour',
      applicationDeadline: '30/01/2025',
      applicationUrl: 'https://amazon.jobs/en/search'
    },
    {
      id: '6',
      company: 'Tesla',
      companyUrl: 'https://tesla.com/careers',
      role: 'Research Intern',
      location: 'Palo Alto, CA',
      postedDate: '28/11/2024',
      payRate: '$38/hour',
      applicationDeadline: 'Rolling',
      applicationUrl: 'https://tesla.com/careers'
    }
  ];

  const data = internships.length > 0 ? convertApiData(internships) : sampleData;

  const formatDate = (dateString: string) => {
    return dateString;
  };

  const getDeadlineColor = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline.split('/').reverse().join('-'));
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 0) return 'text-red-600 bg-red-50';
    if (daysUntilDeadline <= 3) return 'text-orange-600 bg-orange-50';
    if (daysUntilDeadline <= 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100"></div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 border-t border-gray-200 bg-white"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
        <div className="grid grid-cols-[1fr_2fr_1.2fr_1.2fr_0.8fr_0.8fr_1fr_0.8fr_3fr] gap-6 px-6 py-4">
          <div className="flex items-center border-r border-gray-300 pr-4">
            <span className="font-bold text-gray-900 text-base">Company</span>
          </div>
          <div className="flex items-center border-r border-gray-300 pr-4">
            <span className="font-bold text-gray-900 text-base">Role</span>
          </div>
          <div className="flex items-center border-r border-gray-300 pr-4">
            <span className="font-bold text-gray-900 text-base">Location</span>
          </div>
          <div className="flex items-center border-r border-gray-300 pr-4">
            <span className="font-bold text-gray-900 text-base">Graduation Year</span>
          </div>
          <div className="flex items-center border-r border-gray-300 pr-4">
            <span className="font-bold text-gray-900 text-base">Pay Rate</span>
          </div>
          <div className="flex items-center border-r border-gray-300 pr-4">
            <span className="font-bold text-gray-900 text-base">Posted Date</span>
          </div>
          <div className="flex items-center border-r border-gray-300 pr-4">
            <span className="font-bold text-gray-900 text-base">Deadline</span>
          </div>
          <div className="flex items-center border-r border-gray-300 pr-4">
            <span className="font-bold text-gray-900 text-base">Application</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold text-gray-900 text-base">Requirements</span>
          </div>
        </div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-gray-200">
        {data.map((internship, index) => (
          <div 
            key={internship.id} 
            className={`grid grid-cols-[1fr_2fr_1.2fr_1.2fr_0.8fr_0.8fr_1fr_0.8fr_3fr] gap-6 px-6 py-4 hover:bg-gray-50 transition-colors duration-200 ${
              index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
            }`}
          >
            {/* Company */}
            <div className="flex items-start py-2 border-r border-gray-200 pr-4">
              <a 
                href={internship.companyUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200 break-words"
              >
                {typeof internship.company === 'string' ? internship.company : internship.company.name}
              </a>
            </div>

            {/* Role */}
            <div className="flex items-start py-2 border-r border-gray-200 pr-4">
              <span className="text-sm text-gray-900 font-medium break-words leading-relaxed">{internship.role}</span>
            </div>

            {/* Location */}
            <div className="flex items-start py-2 border-r border-gray-200 pr-4">
              <span className="text-sm text-gray-700 break-words leading-relaxed">{internship.location}</span>
            </div>

            {/* Graduation Year */}
            <div className="flex items-start py-2 border-r border-gray-200 pr-4">
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium break-words">
                {internship.graduationYear || 'Not specified'}
              </span>
            </div>

            {/* Pay Rate */}
            <div className="flex items-start py-2 border-r border-gray-200 pr-4">
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full break-words">{internship.payRate}</span>
            </div>

            {/* Posted Date */}
            <div className="flex items-start py-2 border-r border-gray-200 pr-4">
              <span className="text-sm text-gray-600 font-medium break-words">{formatDate(internship.postedDate)}</span>
            </div>

            {/* Deadline */}
            <div className="flex items-start py-2 border-r border-gray-200 pr-4">
              <span className={`text-xs font-medium px-2 py-1 rounded-full break-words ${getDeadlineColor(internship.applicationDeadline)}`}>
                {internship.applicationDeadline === 'Rolling' ? 'Rolling' : formatDate(internship.applicationDeadline)}
              </span>
            </div>

            {/* Application */}
            <div className="flex items-start py-2 border-r border-gray-200 pr-4">
              <a
                href={internship.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-900 hover:shadow-md transition-all duration-200 transform hover:scale-105 whitespace-nowrap"
              >
                Apply
              </a>
            </div>

            {/* Requirements */}
            <div className="flex items-start py-2">
              <span 
                className="text-sm text-gray-700 break-words leading-relaxed" 
                title={internship.requirements || 'No requirements specified'}
              >
                {internship.requirements || 'Not specified'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
