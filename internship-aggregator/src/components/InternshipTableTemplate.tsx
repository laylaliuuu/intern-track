'use client';

interface InternshipData {
  id: string;
  company: string;
  companyUrl: string;
  role: string;
  location: string;
  postedDate: string;
  payRate: string;
  applicationDeadline: string;
  applicationUrl: string;
}

interface InternshipTableTemplateProps {
  internships: InternshipData[];
  isLoading?: boolean;
}

export default function InternshipTableTemplate({ internships, isLoading = false }: InternshipTableTemplateProps) {
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

  const data = internships.length > 0 ? internships : sampleData;

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
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-[1.5fr_3fr_2fr_1fr_1fr_1.5fr_1.5fr] gap-4 px-6 py-6">
          <div className="flex items-center">
            <span className="font-semibold text-gray-900 text-lg">Company</span>
          </div>
          <div className="flex items-center">
            <span className="font-semibold text-gray-900 text-lg">Role</span>
          </div>
          <div className="flex items-center">
            <span className="font-semibold text-gray-900 text-lg">Location</span>
          </div>
          <div className="flex items-center">
            <span className="font-semibold text-gray-900 text-lg">Application</span>
          </div>
          <div className="flex items-center">
            <span className="font-semibold text-gray-900 text-lg">Pay Rate</span>
          </div>
          <div className="flex items-center">
            <span className="font-semibold text-gray-900 text-lg">Posted Date</span>
          </div>
          <div className="flex items-center">
            <span className="font-semibold text-gray-900 text-lg">Deadline</span>
          </div>
        </div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-gray-200">
        {data.map((internship) => (
          <div 
            key={internship.id} 
            className="grid grid-cols-[1.5fr_3fr_2fr_1fr_1fr_1.5fr_1.5fr] gap-4 px-6 hover:bg-gray-50 transition-colors duration-200"
            style={{ 
              paddingTop: '20px', 
              paddingBottom: '20px',
              marginBottom: '8px'
            }}
          >
            {/* Company */}
            <div className="flex items-center py-2">
              <a 
                href={internship.companyUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
              >
                {internship.company}
              </a>
            </div>

            {/* Role */}
            <div className="flex items-center py-2">
              <span className="text-sm text-gray-900 font-medium">{internship.role}</span>
            </div>

            {/* Location */}
            <div className="flex items-center py-2">
              <span className="text-sm text-gray-700">{internship.location}</span>
            </div>

            {/* Application */}
            <div className="flex items-center py-2">
              <a
                href={internship.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-900 hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                Apply
              </a>
            </div>

            {/* Pay Rate */}
            <div className="flex items-center py-2">
              <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">{internship.payRate}</span>
            </div>

            {/* Posted Date */}
            <div className="flex items-center py-2">
              <span className="text-sm text-gray-600 font-medium">{formatDate(internship.postedDate)}</span>
            </div>

            {/* Deadline */}
            <div className="flex items-center py-2">
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${getDeadlineColor(internship.applicationDeadline)}`}>
                {internship.applicationDeadline === 'Rolling' ? 'Rolling Admission' : formatDate(internship.applicationDeadline)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
