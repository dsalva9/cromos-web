# Legacy Features

This document tracks features that are deprecated or legacy and should **NOT** be extended or enhanced.

## ⚠️ Trade/Intercambios System (LEGACY)

**Status:** Legacy - Do not implement new features
**Date Deprecated:** December 2, 2025
**Reason:** Functionality superseded by Marketplace Listings system

### What is Legacy

The **Trade/Intercambios** system includes:

- Trade proposals (`trade_proposals` table)
- Trade items (`trade_proposal_items` table)
- Trade chats (when `trade_id` is set in `trade_chats` table)
- Trade-related notifications:
  - `chat_unread` - Chat messages in trade context
  - `proposal_accepted` - Trade proposal accepted
  - `proposal_rejected` - Trade proposal rejected
  - `finalization_requested` - Request to finalize trade

### Files and Components

**Database:**
- `supabase/migrations/*` - Any migration mentioning "trade_proposals" or "trade_items"
- Tables: `trade_proposals`, `trade_proposal_items`, `trade_finalizations`, `trades_history`

**Backend:**
- RPCs related to trade proposals (search for `trade_proposal`)
- Triggers on trade tables

**Frontend:**
- Components in `src/components/trades/` (if they exist)
- Pages related to `/intercambios` or `/trades`
- Hooks using trade proposal data

**Notifications:**
- Trade notification types are disabled by default in user preferences
- Hidden from notification settings UI
- Kept in database for backward compatibility only

### Migration Path

Users should use the **Marketplace Listings** system instead:
- Create listings for items they want to sell/trade
- Chat directly about listings
- Reserve and complete transactions through listings

### Maintenance Guidelines

1. **DO NOT** create new features for the trade system
2. **DO NOT** enhance existing trade functionality
3. **DO** keep existing functionality working for users who still have active trades
4. **DO** fix critical bugs if they impact active trades
5. **DO** migrate users away from trades when possible
6. **DO** mark all trade-related code with `// LEGACY:` comments

### Code Examples

```typescript
// LEGACY: Trade proposal system - do not extend
// Use Marketplace Listings instead
function getTradeProposals() {
  // ...
}
```

```sql
-- LEGACY: Trade notifications disabled by default
-- See get_default_notification_preferences() function
```

## Future Deprecations

None planned at this time.

---

**Last Updated:** December 2, 2025
