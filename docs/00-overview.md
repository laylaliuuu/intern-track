# Overview

## Problem
Internship postings are fragmented, noisy, and frequently outdated. Existing search results include generic career pages, guides, expired roles, student discount pages, and blocked/auth-required URLs. Curators (e.g., Instagram posters) provide high trust because they filter aggressively and post fresh links daily.

## Solution (MVP)
Build a high-precision internship listings platform that:
- Discovers postings from multiple sources
- Hard-filters for legitimacy, availability, and target season/year
- Extracts structured fields accurately
- Deduplicates across sources
- Shows a fast filterable table UI
- Records "Site Added Date" (freshness feed, like curators)

## Differentiation
Precision + reliability over volume.
We prefer fewer postings with higher trust.

## Core principles
- Never guess. If a field is not reliably extractable: store/display "Not found".
- Filtering is a hard gate. Do not expose excluded records in user-facing lists.
- Preserve evidence for high-risk fields (pay/class year/deadline/posted date/location).
- Site Added Date is first-class (the day we publish to our DB/UI).

## MVP user story
"As a student, I want to see new Summer 2026 internships from top companies in one place, with accurate title/company/location/pay, and I want to filter quickly. I trust the site because it excludes junk and tells me when items were added."

