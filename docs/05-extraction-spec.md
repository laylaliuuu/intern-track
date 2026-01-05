# Extraction Spec (Accuracy-first)

## Global rules
- Never guess.
- If cannot reliably extract, store "Not found" and do not fabricate.
- Prefer structured data: ATS JSON / JSON-LD JobPosting.
- Persist evidence for: pay, class_year, posted_date, deadline, location, requirements (when available).

## Field specs

### title (required)
Source order:
1) ATS JSON title
2) JSON-LD "title"
3) <h1> or primary heading
Constraints:
- Preserve exact title text.

### company_name (required)
Source order:
1) ATS JSON company
2) JSON-LD "hiringOrganization.name"
3) domain mapping table (fallback)
Constraints:
- Do not guess from unrelated text; prefer stable sources.

### location_text
Source order:
1) ATS location field
2) JSON-LD jobLocation (addressLocality/region/country)
3) DOM "Location:" label patterns
Fallback:
- "Not found"

### pay_text
Source order:
1) ATS compensation field if present
2) DOM compensation/salary range section
3) regex over page text for:
  - $xx/hr, $xx–$yy/hr
  - $xx,xxx–$yy,yyy per year
Fallback:
- "Not found"
Evidence:
- If found, store snippet containing the compensation line(s).

### posted_date / posted_date_text
Source order:
1) JSON-LD datePosted
2) ATS posted/created time
3) DOM "Posted on ..."
Fallback:
- posted_date = null, posted_date_text = "Not found"
Important:
- Do not map site_added_date to posted_date.

### deadline_date / deadline_text
Source order:
- DOM "Apply by", "Applications close", etc
Fallback:
- deadline_date = null, deadline_text = "Not found"
Note:
- Many postings have no explicit deadline. That's acceptable.

### class_year_value / class_year_text
Source order (strict):
1) explicit "Class of 2027"
2) explicit graduation window mapping ("Graduation between Dec 2026 and Jun 2027")
Reject:
- vague academic standing (junior/sophomore) for MVP
Fallback:
- class_year_value = null, class_year_text = "Not found"
Evidence required:
- Only set value if a direct snippet supports it.

### requirements_text
Source order:
1) ATS "requirements" / "qualifications"
2) DOM headings:
  - Minimum Qualifications / Basic Qualifications / Requirements / What you'll bring
Output:
- newline-separated bullets or JSON array in storage (choose one; MVP can be newline text)
Fallback:
- "Not found"
Evidence:
- Store snippet if extracted from a clear section.

