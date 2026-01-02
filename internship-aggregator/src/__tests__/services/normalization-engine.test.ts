// Tests for normalization engine
import { normalizationEngine } from '../../services/data-processing/normalization-engine';
import { RawInternshipData, InternshipRole, WorkType, EligibilityYear } from '../../types';

describe('NormalizationEngine', () => {
  const mockRawData: RawInternshipData = {
    source: 'test_source',
    sourceType: 'company_career_page' as any,
    url: 'https://example.com/job',
    title: 'Software Engineering Intern',
    company: 'Test Company',
    description: 'We are looking for a software engineering intern with Python and React experience. This is a paid internship for undergraduate students.',
    location: 'San Francisco, CA',
    postedAt: '2024-01-15',
    applicationUrl: 'https://example.com/apply',
    applicationDeadline: '2024-02-15',
    internshipCycle: 'Summer 2025',
    eligibilityYear: 'Junior',
    rawPayload: {}
  };

  beforeEach(() => {
    normalizationEngine.resetProcessedHashes();
  });

  describe('normalize', () => {
    it('should normalize a valid internship', async () => {
      const result = await normalizationEngine.normalize(mockRawData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe('Software Engineering Intern');
      expect(result.data?.company).toBe('Test Company');
      expect(result.data?.normalizedRole).toBe(InternshipRole.SOFTWARE_ENGINEERING);
      expect(result.data?.workType).toBe(WorkType.PAID);
      expect(result.data?.skills).toContain('python');
      expect(result.data?.skills).toContain('react');
    });

    it('should handle duplicate entries', async () => {
      // First normalization
      await normalizationEngine.normalize(mockRawData);

      // Second normalization with same data
      const result = await normalizationEngine.normalize(mockRawData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Duplicate entry detected');
    });

    it('should extract skills from description', async () => {
      const result = await normalizationEngine.normalize(mockRawData);

      expect(result.success).toBe(true);
      expect(result.data?.skills).toContain('python');
      expect(result.data?.skills).toContain('react');
    });

    it('should determine work type correctly', async () => {
      const paidData = { ...mockRawData, description: 'Paid internship with competitive salary' };
      const unpaidData = { ...mockRawData, description: 'Unpaid internship for experience' };

      const paidResult = await normalizationEngine.normalize(paidData);
      const unpaidResult = await normalizationEngine.normalize(unpaidData);

      expect(paidResult.data?.workType).toBe(WorkType.PAID);
      expect(unpaidResult.data?.workType).toBe(WorkType.UNPAID);
    });

    it('should determine eligibility year', async () => {
      const result = await normalizationEngine.normalize(mockRawData);

      expect(result.success).toBe(true);
      expect(result.data?.eligibilityYear).toContain(EligibilityYear.JUNIOR);
    });
  });

  describe('normalizeMany', () => {
    it('should normalize multiple internships', async () => {
      const rawDataArray = [mockRawData, { ...mockRawData, title: 'Data Science Intern' }];
      
      const result = await normalizationEngine.normalizeMany(rawDataArray);

      expect(result.results).toHaveLength(2);
      expect(result.metrics.totalProcessed).toBe(2);
      expect(result.metrics.successful).toBe(2);
      expect(result.metrics.failed).toBe(0);
    });

    it('should handle mixed success/failure results', async () => {
      const rawDataArray = [
        mockRawData,
        { ...mockRawData, title: '', company: '' }, // Invalid data
        { ...mockRawData, title: 'Product Manager Intern' }
      ];
      
      const result = await normalizationEngine.normalizeMany(rawDataArray);

      expect(result.results).toHaveLength(3);
      expect(result.metrics.totalProcessed).toBe(3);
      expect(result.metrics.successful).toBeGreaterThan(0);
    });
  });

  describe('role normalization', () => {
    it('should normalize software engineering roles', async () => {
      const seData = { ...mockRawData, title: 'Software Engineer Intern' };
      const result = await normalizationEngine.normalize(seData);

      expect(result.data?.normalizedRole).toBe(InternshipRole.SOFTWARE_ENGINEERING);
    });

    it('should normalize data science roles', async () => {
      const dsData = { ...mockRawData, title: 'Data Science Intern', description: 'Machine learning and data analysis' };
      const result = await normalizationEngine.normalize(dsData);

      expect(result.data?.normalizedRole).toBe(InternshipRole.DATA_SCIENCE);
    });

    it('should normalize product management roles', async () => {
      const pmData = { ...mockRawData, title: 'Product Manager Intern', description: 'Product strategy and user research' };
      const result = await normalizationEngine.normalize(pmData);

      expect(result.data?.normalizedRole).toBe(InternshipRole.PRODUCT_MANAGEMENT);
    });
  });

  describe('skill extraction', () => {
    it('should extract technical skills', async () => {
      const techData = { 
        ...mockRawData, 
        description: 'Experience with JavaScript, Python, React, Node.js, AWS, Docker' 
      };
      const result = await normalizationEngine.normalize(techData);

      expect(result.data?.skills).toContain('javascript');
      expect(result.data?.skills).toContain('python');
      expect(result.data?.skills).toContain('react');
      expect(result.data?.skills).toContain('node.js');
      expect(result.data?.skills).toContain('aws');
      expect(result.data?.skills).toContain('docker');
    });

    it('should extract soft skills', async () => {
      const softSkillsData = { 
        ...mockRawData, 
        description: 'Strong communication skills, leadership experience, teamwork' 
      };
      const result = await normalizationEngine.normalize(softSkillsData);

      expect(result.data?.skills).toContain('communication');
      expect(result.data?.skills).toContain('leadership');
      expect(result.data?.skills).toContain('teamwork');
    });
  });

  describe('date parsing', () => {
    it('should parse valid dates', async () => {
      const result = await normalizationEngine.normalize(mockRawData);

      expect(result.data?.postedAt).toBeInstanceOf(Date);
      expect(result.data?.applicationDeadline).toBeInstanceOf(Date);
    });

    it('should handle invalid dates gracefully', async () => {
      const invalidDateData = { ...mockRawData, postedAt: 'invalid-date' };
      const result = await normalizationEngine.normalize(invalidDateData);

      expect(result.success).toBe(true);
      expect(result.data?.postedAt).toBeInstanceOf(Date);
    });
  });
});
