# Comprehensive Validation Pipeline

## Overview
This document describes the 5-step validation pipeline implemented for internship URL validation.

## Steps

### Step 1: URL Reachability Check
- Makes HEAD request (faster), falls back to GET if needed
- Follows redirects manually (max 5 redirects)
- Classifies status codes:
  - **200-399**: ✅ Pass
  - **400-499**: ❌ Fail (broken link)
  - **500-599**: ❌ Fail but retry once

**Stored Results:**
```json
{
  "status": "ok" | "dead",
  "http_code": 200,
  "final_url": "https://careers/.../intern",
  "redirects": ["original", "intermediate"]
}
```

### Step 2: Detect Redirects
Auto-follows redirects and analyzes quality:
- **Homepage redirect** → Low quality (-3 points)
- **Login page redirect** → Medium quality (warn but still valid)
- **Generic /careers redirect** → Low quality (-3 points)
- **Search/browse page** → Low quality (-3 points)
- **Specific job page** → High quality

### Step 3: HTML Keyword Scan
Fetches HTML and scans for keywords:

#### ❌ Expired / Not Taking Applicants
Looks for:
- "Position Filled"
- "No longer accepting applications"
- "Applications Closed"
- "Not accepting applicants"
- "This job posting is no longer available"
- "We are no longer hiring"
- "Expired"
- "Archived"
- "Inactive"

If found → mark as **expired** (-5 points)

#### ❌ Useless Career Pages
If page contains:
- "Search all jobs"
- "View openings"
- "Browse jobs"
- AND no words: "intern", "internship", "student", "new grad"
→ mark as irrelevant (-3 points)

#### ✔️ Good Listing
Looks for:
- "Internship"
- "Intern"
- "Summer"
- "2025 Internship" / "2026 Internship"
- "Apply"
- "Responsibilities"
- "Qualifications"
- "Job description"
- "Apply now"
- "Application deadline"
- "Internship program"
- "Co-op program"
- "Undergraduate"
- "Bachelor's degree"
- "Class of 202X"
- "Currently hiring"
- "Accepting applications"

If found (≥2 indicators) → mark as high-quality (+3 points)

### Step 4: Duplicate Detection
Normalizes URLs:
- Removes tracking parameters (?utm, ?gh_jid, ?ref, etc.)
- Normalizes path (removes trailing slash)
- Compares canonical URLs

### Step 5: Final Scoring
Each URL gets a score:

| Category | Score |
|----------|-------|
| Reachable (200-399) | +3 |
| Contains internship keywords | +3 |
| Has Apply button/keywords | +4 |
| Redirects to generic career page | -3 |
| Expired keyword found | -5 |
| 400/500 status | -10 |
| Useless career page | -3 |

**Threshold:**
- **≥ 5** → ✅ Valid listing
- **1-4** → ⚠️ Maybe valid (manual review)
- **≤ 0** → ❌ Discard

## Handling "No Longer Taking Applicants"

### Detection Mechanism
Looks for explicit expiration keywords (see Step 3).

If match → `{ "status": "expired", "reason": "explicit_expired_keyword" }`

### Automatic Handling
When `update=true` is passed:
- Sets `is_active = false` for expired/dead listings
- Sets `is_active = true` for valid listings
- Stores validation results in database

## Database Schema

New fields added to `internships` table:
- `validation_status`: 'valid' | 'expired' | 'dead' | 'pending' | 'maybe_valid'
- `validation_score`: INTEGER
- `validation_http_code`: INTEGER
- `validation_final_url`: TEXT
- `validation_redirects`: JSONB
- `validation_reason`: TEXT
- `validation_last_checked`: TIMESTAMPTZ
- `is_active`: BOOLEAN (default: true)

## API Endpoint

### GET /api/validate-pipeline

**Query Parameters:**
- `update=true` - Update database with validation results
- `limit=N` - Limit number of records to validate (default: all)

**Response:**
```json
{
  "total": 586,
  "valid": 274,
  "expired": 50,
  "dead": 200,
  "maybe_valid": 62,
  "updated": 586,
  "errors": 0,
  "averageValidationTime": 1100,
  "results": [...]
}
```

## Example Output

### Valid Listing:
```json
{
  "company": "Stripe",
  "url": "https://careers.stripe.com/jobs/12345",
  "status": "ok",
  "http_code": 200,
  "expires": false,
  "score": 10,
  "reason": "Valid listing - high quality",
  "last_checked": "2025-01-03T05:21:00Z"
}
```

### Expired:
```json
{
  "company": "Uber",
  "url": "https://careers.uber.com/job/54321",
  "status": "expired",
  "reason": "Expired: applications closed",
  "score": -4
}
```

### Broken:
```json
{
  "status": "dead",
  "http_code": 404,
  "reason": "HTTP 404 - Page not reachable"
}
```

## Usage

### Run validation without updating database:
```bash
curl "http://localhost:3000/api/validate-pipeline"
```

### Run validation and update database:
```bash
curl "http://localhost:3000/api/validate-pipeline?update=true"
```

### Validate first 10 records:
```bash
curl "http://localhost:3000/api/validate-pipeline?limit=10&update=true"
```

