# SaaS Schema

## Tables

### users

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| email | text | |
| company_size | integer | Number of employees |
| created_at | timestamp | Signup date |

### plans

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | enum | 'trial', 'starter', 'pro', 'enterprise' |
| price | numeric | 0, 29, 79, 299 |
| billing_cycle | enum | 'monthly', 'yearly' |

### subscriptions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| plan_id | uuid | FK → plans |
| status | enum | 'active', 'canceled', 'past_due' |
| started_at | timestamp | |
| ends_at | timestamp | |
| canceled_at | timestamp | Nullable |

### events

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| action | enum | 'login', 'logout', 'feature_used', 'upgrade', 'downgrade', 'billing_failed' |
| feature | enum | 'dashboard', 'reports' (nullable, only for feature_used) |
| timestamp | timestamp | |

## Relationships

```
users (1) ──→ (N) subscriptions ──→ (1) plans
users (1) ──→ (N) events
```
