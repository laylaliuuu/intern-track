// Unit tests for Exa.ai API client
import { ExaClient, ExaApiError } from '../lib/exa-client';

// Mock fetch globally
global.fetch = jest.fn();

describe('ExaClient', () => {
  let client: ExaClient;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    client = new ExaClient(mockApiKey);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with provided API key', () => {
      const testClient = new ExaClient('custom-key');
      expect(testClient).toBeInstanceOf(ExaClient);
    });

    it('should throw error if no API key provided', () => {
      // Clear environment variable
      const originalEnv = process.env.EXA_API_KEY;
      delete process.env.EXA_API_KEY;

      expect(() => new ExaClient()).toThrow('EXA_API_KEY is required');

      // Restore environment variable
      if (originalEnv) {
        process.env.EXA_API_KEY = originalEnv;
      }
    });
  });

  describe('search', () => {
    it('should make successful search request', async () => {
      const mockResponse = {
        results: [
          {
            id: 'test-id',
            url: 'https://example.com',
            title: 'Test Internship',
            score: 0.95
          }
        ],
        requestId: 'req-123'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.search({
        query: 'software engineering internship',
        numResults: 10
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.exa.ai/search',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': mockApiKey
          }),
          body: expect.stringContaining('software engineering internship')
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const mockError = {
        message: 'Invalid API key',
        code: 'INVALID_KEY',
        requestId: 'req-456'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve(mockError)
      });

      await expect(client.search({ query: 'test' })).rejects.toThrow(ExaApiError);
    });

    it('should apply rate limiting', async () => {
      const mockResponse = {
        results: [],
        requestId: 'req-789'
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Make multiple concurrent requests
      const promises = Array(5).fill(0).map(() => 
        client.search({ query: 'test', numResults: 1 })
      );

      await Promise.all(promises);

      // Should have made 5 requests but with rate limiting
      expect(fetch).toHaveBeenCalledTimes(5);
    });

    it('should use default parameters', async () => {
      const mockResponse = {
        results: [],
        requestId: 'req-default'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await client.search({ query: 'test' });

      const callArgs = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toMatchObject({
        query: 'test',
        type: 'neural',
        useAutoprompt: true,
        numResults: 10,
        includeText: false,
        includeHighlights: false,
        includeSummary: false
      });
    });
  });

  describe('getContents', () => {
    it('should fetch content for given IDs', async () => {
      const mockResponse = {
        results: [
          {
            id: 'test-id',
            url: 'https://example.com',
            title: 'Test Content',
            text: 'Full content text'
          }
        ],
        requestId: 'req-content'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.getContents({
        ids: ['test-id'],
        text: true
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.exa.ai/contents',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test-id')
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('searchInternships', () => {
    it('should build optimized internship query', async () => {
      const mockResponse = {
        results: [],
        requestId: 'req-internships'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await client.searchInternships({
        role: 'software engineering',
        company: 'Google',
        location: 'San Francisco',
        cycle: 'Summer 2025'
      });

      const callArgs = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.query).toContain('internship');
      expect(body.query).toContain('software engineering');
      expect(body.query).toContain('Google');
      expect(body.query).toContain('San Francisco');
      expect(body.query).toContain('Summer 2025');
      expect(body.includeDomains).toContain('careers.google.com');
    });
  });

  describe('searchCompanyPrograms', () => {
    it('should search for company-specific programs', async () => {
      const mockResponse = {
        results: [],
        requestId: 'req-company'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await client.searchCompanyPrograms('Microsoft');

      const callArgs = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.query).toContain('Microsoft');
      expect(body.query).toContain('internship program');
      expect(body.includeDomains).toContain('careers.microsoft.com');
    });
  });

  describe('searchDiversityPrograms', () => {
    it('should search for diversity programs', async () => {
      const mockResponse = {
        results: [],
        requestId: 'req-diversity'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await client.searchDiversityPrograms();

      const callArgs = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.query).toContain('diversity');
      expect(body.query).toContain('STEP');
      expect(body.query).toContain('underrepresented');
    });
  });

  describe('healthCheck', () => {
    it('should return true for successful health check', async () => {
      const mockResponse = {
        results: [],
        requestId: 'req-health'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false for failed health check', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });
});

describe('ExaApiError', () => {
  it('should create error with all properties', () => {
    const error = new ExaApiError('Test error', 400, 'BAD_REQUEST', 'req-123');
    
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.requestId).toBe('req-123');
    expect(error.name).toBe('ExaApiError');
  });
});