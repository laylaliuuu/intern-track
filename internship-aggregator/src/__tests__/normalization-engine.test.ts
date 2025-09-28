// Unit tests for normalization engine
import { NormalizationEngine } from '../services/normalization-engine';
import { RawInternshipData, InternshipRole, WorkType, EligibilityYear, InternshipSourceType } from '../types';

describe('NormalizationEngine', () => {
  let engine: NormalizationEngine;

  beforeEach(() => {
    engine = new NormalizationEngine();
  });

  describe('normalize', () => {
    it('should normalize a complete software engineering internship', async () => {
      const rawData: RawInternshipData = {
        source: 'Exa.ai',
        sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
        url: 'https://careers.google.com/jobs/results/123456789',
        title: 'Software Engineering Intern - Summer 2025',
        company: 'Google',
        description: 'Join Google as a Software Engineering Intern and work on cutting-edge projects. Requirements: Computer Science major, Python, Java, C++ experience. For junior and senior students.',
        location: 'Mountain View, CA',
        postedAt: '2024-09-28T10:00:00Z',
        applicationUrl: 'https://careers.google.com/jobs/results/123456789/apply',
        rawPayload: {}
      };

      const result = await engine.normalize(rawData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.normalizedRole).toBe(InternshipRole.SOFTWARE_ENGINEERING);
      expect(result.data!.relevantMajors).toContain('Computer Science');
      expect(result.data!.skills).toContain('Python');
      expect(result.data!.skills).toContain('Java');
      expect(result.data!.skills).toContain('C++');
      expect(result.data!.eligibilityYear).toContain(EligibilityYear.JUNIOR);
      expect(result.data!.eligibilityYear).toContain(EligibilityYear.SENIOR);
      expect(result.data!.internshipCycle).toBe('Summer 2025');
      expect(result.data!.workType).toBe(WorkType.PAID);
      expect(result.data!.location).toBe('Mountain View, CA');
      expect(result.data!.isRemote).toBe(false);
    });

    it('should handle remote internships', async () => {
      const rawData: RawInternshipData = {
        source: 'Exa.ai',
        sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
        url: 'https://example.com/remote-job',
        title: 'Remote Data Science Intern',
        company: 'TechCorp',
        description: 'Work from home data science internship with machine learning focus.',
        location: 'Remote',
        rawPayload: {}
      };

      const result = await engine.normalize(rawData);

      expect(result.success).toBe(true);
      expect(result.data!.isRemote).toBe(true);
      expect(result.data!.location).toBe('Remote');
      expect(result.data!.normalizedRole).toBe(InternshipRole.DATA_SCIENCE);
    });

    it('should identify program-specific internships', async () => {
      const rawData: RawInternshipData = {
        source: 'Exa.ai',
        sourceType: InternshipSourceType.PROGRAM_PAGE,
        url: 'https://careers.google.com/step',
        title: 'STEP Intern - Google (First and Second Year Students)',
        company: 'Google',
        description: 'The Student Training in Engineering Program (STEP) is designed for first and second-year undergraduate students.',
        location: 'Multiple Locations',
        rawPayload: {}
      };

      const result = await engine.normalize(rawData);

      expect(result.success).toBe(true);
      expect(result.data!.isProgramSpecific).toBe(true);
      expect(result.data!.eligibilityYear).toContain(EligibilityYear.FRESHMAN);
      expect(result.data!.eligibilityYear).toContain(EligibilityYear.SOPHOMORE);
    });

    it('should handle unpaid internships', async () => {
      const rawData: RawInternshipData = {
        source: 'Manual',
        sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
        url: 'https://nonprofit.org/internship',
        title: 'Unpaid Research Intern',
        company: 'Nonprofit Org',
        description: 'This is an unpaid internship opportunity for academic credit.',
        rawPayload: {}
      };

      const result = await engine.normalize(rawData);

      expect(result.success).toBe(true);
      expect(result.data!.workType).toBe(WorkType.UNPAID);
      expect(result.data!.normalizedRole).toBe(InternshipRole.RESEARCH);
    });

    it('should extract product management roles', async () => {
      const rawData: RawInternshipData = {
        source: 'Exa.ai',
        sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
        url: 'https://careers.microsoft.com/pm-intern',
        title: 'Product Management Intern - Summer 2025',
        company: 'Microsoft',
        description: 'Product manager intern role focusing on product strategy and market analysis. Business or Economics major preferred.',
        location: 'Redmond, WA',
        rawPayload: {}
      };

      const result = await engine.normalize(rawData);

      expect(result.success).toBe(true);
      expect(result.data!.normalizedRole).toBe(InternshipRole.PRODUCT_MANAGEMENT);
      expect(result.data!.relevantMajors).toContain('Business');
      expect(result.data!.skills).toContain('Market Analysis');
    });

    it('should handle missing required fields', async () => {
      const rawData: RawInternshipData = {
        source: 'Test',
        sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
        url: '',
        title: '',
        company: '',
        description: 'Some description',
        rawPayload: {}
      };

      const result = await engine.normalize(rawData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required fields: title, company, or url');
    });

    it('should detect duplicates', async () => {
      const rawData: RawInternshipData = {
        source: 'Test',
        sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
        url: 'https://example.com/job',
        title: 'Software Intern',
        company: 'TestCorp',
        description: 'Test internship',
        location: 'San Francisco, CA',
        rawPayload: {}
      };

      // First normalization should succeed
      const result1 = await engine.normalize(rawData);
      expect(result1.success).toBe(true);

      // Second normalization should detect duplicate
      const result2 = await engine.normalize(rawData);
      expect(result2.success).toBe(false);
      expect(result2.errors).toContain('Duplicate internship detected');
    });

    it('should infer internship cycle from posted date', async () => {
      const rawData: RawInternshipData = {
        source: 'Test',
        sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
        url: 'https://example.com/job2',
        title: 'Engineering Intern',
        company: 'TestCorp',
        description: 'Engineering internship opportunity',
        postedAt: '2024-09-15T10:00:00Z', // September posting
        rawPayload: {}
      };

      const result = await engine.normalize(rawData);

      expect(result.success).toBe(true);
      expect(result.data!.internshipCycle).toBe('Summer 2025');
    });

    it('should normalize location aliases', async () => {
      const rawData: RawInternshipData = {
        source: 'Test',
        sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
        url: 'https://example.com/job3',
        title: 'Software Intern',
        company: 'TestCorp',
        description: 'Internship in the Bay Area',
        location: 'SF',
        rawPayload: {}
      };

      const result = await engine.normalize(rawData);

      expect(result.success).toBe(true);
      expect(result.data!.location).toBe('San Francisco, CA');
    });
  });

  describe('normalizeMany', () => {
    it('should process multiple internships and return metrics', async () => {
      const rawDataArray: RawInternshipData[] = [
        {
          source: 'Test',
          sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
          url: 'https://example.com/job1',
          title: 'Software Intern 1',
          company: 'TestCorp',
          description: 'First internship',
          rawPayload: {}
        },
        {
          source: 'Test',
          sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
          url: 'https://example.com/job2',
          title: 'Software Intern 2',
          company: 'TestCorp',
          description: 'Second internship',
          rawPayload: {}
        },
        {
          source: 'Test',
          sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
          url: '', // Invalid - missing URL
          title: 'Invalid Intern',
          company: 'TestCorp',
          description: 'Invalid internship',
          rawPayload: {}
        }
      ];

      const { results, metrics } = await engine.normalizeMany(rawDataArray);

      expect(results).toHaveLength(3);
      expect(metrics.totalProcessed).toBe(3);
      expect(metrics.successful).toBe(2);
      expect(metrics.failed).toBe(1);
      expect(metrics.executionTime).toBeGreaterThan(0);
    });
  });

  describe('utility methods', () => {
    it('should reset processed hashes', () => {
      engine.resetProcessedHashes();
      expect(engine.getProcessedCount()).toBe(0);
    });

    it('should track processed count', async () => {
      const rawData: RawInternshipData = {
        source: 'Test',
        sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
        url: 'https://example.com/unique-job',
        title: 'Unique Intern',
        company: 'TestCorp',
        description: 'Unique internship',
        rawPayload: {}
      };

      await engine.normalize(rawData);
      expect(engine.getProcessedCount()).toBe(1);
    });
  });
});