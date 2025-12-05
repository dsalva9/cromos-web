# Data Retention Policy - CambioCromos

**Version**: 1.0
**Last Updated**: 2025-12-04
**Status**: Draft - Implementation Pending

## Overview

This document defines the data retention policy for CambioCromos, establishing clear guidelines for how long different types of user data are retained and the processes for deletion and anonymization. This policy balances user privacy rights with legal obligations, fraud prevention, and platform integrity.

## Legal Framework

This policy complies with:
- **GDPR** (General Data Protection Regulation)
- **DSA** (Digital Services Act)
- **Spanish Data Protection Law** (LOPDGDD)

## Data Categories and Retention Periods

### 1. Marketplace Listings

**Active listings**: Retained indefinitely until user deletes them.

**Deleted listings**: Retained for **90 days** before permanent deletion.

**Rationale**:
- Prevent scams and fraudulent activity
- Allow investigation of user reports
- Comply with potential police preservation orders (orden de conservación)
- Support dispute resolution

**Stored Data**:
- Listing title, description, and metadata
- Images
- User ID (retained even after deletion)
- Transaction history
- View counts and activity logs

---

### 2. Messages (Trade Chats & Listing Chats)

**Active chats**: Retained while at least one participant has an active account.

**Deleted conversations or deleted accounts**: Message content retained for **180 days**.

**Rationale**:
- Abuse review and investigation
- Evidence for disputes and scam investigations
- Support law enforcement requests
- User protection

**Stored Data**:
- Message content
- Timestamps
- Sender and recipient IDs
- Read status
- Attachment metadata

**Note**: After 180 days, messages are permanently deleted. User IDs and timestamps may be retained for audit purposes.

---

### 3. Reports (Denuncias)

**All reports**: Retained for **1 year** from creation date.

**Rationale**:
- DSA auditability requirements
- Proof of moderation actions
- Dispute management
- Pattern detection for repeat offenders
- Legal protection for the platform

**Stored Data**:
- Report ID
- Reporter ID (anonymized after 1 year)
- Reported user/content ID
- Report reason and description
- Moderation decision and notes
- Admin ID who handled the report
- Timestamps

**Post-retention**: After 1 year, reports are anonymized:
- Reporter ID replaced with hash
- Personal details removed
- Core statistics retained for platform metrics

---

### 4. Moderation Audit Log

**Retention Period**: **Permanent** - Never deleted

**Rationale**:
- Legal protection for the platform
- Transparency and accountability
- Integrity of moderation history
- Evidence for appeals
- DSA compliance

**Stored Data**:
- Admin ID and nickname
- Action type (suspend, delete, warn, etc.)
- Entity type and ID
- Timestamp
- Old and new values (for edits)
- Moderation reason

**Important**: Audit logs contain NO personal user content, only metadata and administrative actions.

---

### 5. User Account Deletion

When a user requests account deletion:

**Immediate Actions**:
- Account marked as deleted
- User cannot log in
- Profile hidden from public view
- Active listings marked as deleted (subject to 90-day retention)

**Retained for 30-90 days** (fraud prevention period):
- User ID (internal reference only)
- Email hash (for preventing immediate re-registration with same email)
- Timestamps
- Internal flags (is_deleted, deletion_reason)
- IP addresses used for registration/login

**Content Handling**:

All content created by the user is:
- **Deleted** if not needed for legal or integrity reasons, OR
- **Anonymized** if required for system integrity:
  - Rating averages (contributor ID anonymized)
  - Audit logs (already anonymized)
  - Template statistics (author marked as "deleted user")
  - Message history involved in open reports

**After 30-90 days**:
- All personal data permanently removed
- Anonymized references remain where necessary
- User ID may be retained in audit logs with "[DELETED USER]" label

---

### 6. Templates & Community Contributions

**Active templates**: Retained indefinitely while public and not deleted.

**Deleted templates**: Retained for **90 days** before permanent removal.

**Rationale**:
- Allow recovery of accidentally deleted templates
- Investigate abuse/copyright claims
- Maintain template ratings integrity

**Ratings & Favourites**:
- Removed on deletion when possible
- Anonymized when part of aggregate statistics
- Template rating averages recalculated after user deletion

**Community Templates**:
- If author deletes account, templates are:
  - Kept public if rated highly (4+ stars, 10+ ratings)
  - Author marked as "[Deleted User]"
  - Moderators can manually delete if inappropriate

---

### 7. Ratings

**User Ratings**: Retained for **1 year** after creation.

**Template Ratings**: Retained for **1 year** after creation.

**Rationale**:
- Trust and safety
- Historical reputation data
- Aggregate rating averages remain important for platform

**Post-deletion Handling**:
- Individual rating records deleted after 1 year
- Aggregate averages (rating_avg, rating_count) persist
- Rater ID anonymized in archived data

---

### 8. Notifications

**Read notifications**: Deleted after **30 days**.

**Unread notifications**: Deleted after **90 days**.

**Rationale**:
- Reduce database bloat
- Notifications are transient by nature
- Users have reasonable time to read them

**Exception**: Notifications related to open moderation cases are retained until case closure + 90 days.

---

### 9. Law Enforcement Requests

**Orden de Conservación** (Preservation Order):

When Spanish police or judicial authorities issue a preservation order:
- Data deletion is **suspended** for the specified user/content
- Data is retained until:
  - Legal proceeding concludes, OR
  - Authority confirms data is no longer needed, OR
  - Maximum legal retention period expires
- A flag is set in the database: `legal_hold_until: DATE`
- Automated deletion jobs skip any data under legal hold

**Process**:
1. Verify legitimacy of request
2. Document the order in audit log
3. Set legal hold flag on affected data
4. Notify legal counsel
5. Monitor for release notification
6. Resume normal deletion schedules after hold is lifted

---

### 10. Backups

**Backup Retention**:
- Daily backups: Retained for **7 days**
- Weekly backups: Retained for **4 weeks**
- Monthly backups: Retained for **12 months**

**Data Deletion in Backups**:
- Backups follow the same logical retention rules
- When data is deleted from production, it remains in existing backups until backup expires
- Users are informed that deleted data may persist in backups for up to 12 months
- Backups are encrypted and access-controlled

**Restoration**:
- If a backup is restored, the deletion schedule resumes based on original deletion timestamps
- No data gets "revived" beyond its retention period

---

### 11. User Rights (GDPR)

Users have the right to request:

**1. Access (Art. 15 GDPR)**
- Full export of their personal data
- Information about how data is processed
- Response time: 30 days

**2. Rectification (Art. 16 GDPR)**
- Correction of inaccurate data
- Completion of incomplete data
- Response time: 30 days

**3. Erasure / "Right to be Forgotten" (Art. 17 GDPR)**
- Account deletion
- Subject to retention windows described above
- Some data may be retained for legal reasons
- Response time: 30 days

**4. Portability (Art. 20 GDPR)**
- Machine-readable export of personal data
- JSON format
- Response time: 30 days

**5. Objection (Art. 21 GDPR)**
- Object to certain processing activities
- Marketing communications (immediately honored)
- Profiling (case-by-case evaluation)

**6. Restriction of Processing (Art. 18 GDPR)**
- Temporarily limit processing while dispute is resolved
- Account suspended but not deleted

**How to Exercise Rights**:
- Email: privacy@cambiocromo.com (or configured support email)
- In-app: Account Settings > Privacy > Request Data / Delete Account
- Response time: 30 days maximum

---

### 12. Anonymization vs. Deletion

**Anonymization** is used when:
- Data is required for system integrity (e.g., rating averages)
- Legal obligations require retention
- Aggregate statistics are needed
- Audit trails must be maintained

**Anonymization Process**:
- Replace user ID with irreversible hash
- Remove all PII (email, name, IP addresses)
- Remove profile data
- Keep only non-identifying metadata

**Deletion** is used when:
- Data is no longer needed for any legal or operational purpose
- User has exercised right to erasure
- Retention period has expired

---

### 13. Data Deletion Automation

**Scheduled Jobs**:
- Daily job checks for expired retention periods
- Runs at 02:00 UTC to minimize load
- Processes deletions in batches of 1000 records
- Logs all deletions to audit log

**Priority Order**:
1. Check for legal holds (skip if present)
2. Process notifications
3. Process messages
4. Process deleted listings
5. Process deleted templates
6. Process deleted accounts
7. Process expired reports
8. Process expired ratings

**Error Handling**:
- Failed deletions are logged
- Retry mechanism with exponential backoff
- Alert admins if deletion job fails 3 times
- Manual review required after 7 consecutive failures

---

### 14. Changes to This Policy

**Notification Requirements**:
- Users notified 30 days before policy changes take effect
- Notification via email and in-app banner
- Users can export data or delete account before changes apply

**Version Control**:
- Each policy version numbered and dated
- Previous versions archived
- Change log maintained

**Material Changes**:
- Reducing retention periods: Notify users, allow opt-out
- Increasing retention periods: Requires explicit user consent
- New data categories: Requires privacy policy update

---

## Implementation Status

### Current Status: **Not Implemented**

This policy is currently **in draft** state. The current implementation has inconsistent data retention practices.

### Planned Implementation

See `docs/guides/DATA_RETENTION_IMPLEMENTATION.md` for:
- Gap analysis
- Database schema changes
- Migration plan
- Automated job specifications
- Testing plan
- Rollout timeline

---

## Appendix: Data Retention Summary Table

| Data Type | Active Retention | Deleted/Inactive Retention | Post-Retention Action |
|-----------|-----------------|---------------------------|----------------------|
| Marketplace Listings | Indefinite | 90 days | Permanent deletion |
| Messages | While user active | 180 days | Permanent deletion |
| Reports | N/A | 1 year | Anonymization |
| Audit Logs | Permanent | N/A | Never deleted |
| User Accounts | Indefinite | 30-90 days | Permanent deletion + anonymization |
| Templates | Indefinite | 90 days | Deletion or anonymization |
| Ratings | 1 year | N/A | Deletion (aggregates remain) |
| Notifications (read) | 30 days | N/A | Permanent deletion |
| Notifications (unread) | 90 days | N/A | Permanent deletion |
| Backups | N/A | 7 days / 4 weeks / 12 months | Automatic purge |

---

## Contact

For questions about this data retention policy:
- **Email**: privacy@cambiocromo.com
- **Legal**: legal@cambiocromo.com
- **DPO**: dpo@cambiocromo.com (if appointed)

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-04 | Platform Team | Initial draft |
