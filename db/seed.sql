-- ============================================================================
-- CRM PLATFORM SEED DATA
-- Default Users, Sample Customers, Touchpoints, and Follow-ups
-- ============================================================================

-- Seed Default Admin and Agent Users (password: 'password123' hashed with bcrypt)
INSERT INTO users (name, email, password, role)
VALUES 
    ('CRM Administrator', 'admin@minicrm.io', '$2b$10$wE9mHlVv4J9eO/2gZf2ZueFh0y8tI6p7Vf6gWbA/y9yZ1y3m9E1m6', 'admin'),
    ('Jane Doe (Senior Agent)', 'jane@minicrm.io', '$2b$10$wE9mHlVv4J9eO/2gZf2ZueFh0y8tI6p7Vf6gWbA/y9yZ1y3m9E1m6', 'agent'),
    ('Marcus Vance (Account Exec)', 'marcus@minicrm.io', '$2b$10$wE9mHlVv4J9eO/2gZf2ZueFh0y8tI6p7Vf6gWbA/y9yZ1y3m9E1m6', 'agent')
ON CONFLICT (email) DO NOTHING;

-- Seed Diverse Customer Base
INSERT INTO customers (name, email, phone, company, status)
VALUES
    ('Acme Enterprise Corp', 'procurement@acme.com', '+1-555-0199', 'Acme Corp', 'active'),
    ('Apex Global Logistics', 'contact@apexlogistics.com', '+1-555-0182', 'Apex Logistics', 'active'),
    ('Starlight Media Group', 'partners@starlight.io', '+1-555-0174', 'Starlight Media', 'lead'),
    ('BlueWave Analytics', 'ops@bluewave.ai', '+1-555-0163', 'BlueWave AI', 'active'),
    ('Horizon Health Systems', 'procure@horizonhealth.org', '+1-555-0155', 'Horizon Health', 'churn_risk'),
    ('Quantum Retail Systems', 'info@quantumretail.com', '+1-555-0144', 'Quantum Retail', 'active'),
    ('Nova Tech Solutions', 'support@novatech.dev', '+1-555-0133', 'Nova Tech', 'lead'),
    ('Crestview Financial', 'invest@crestview.com', '+1-555-0122', 'Crestview Capital', 'active')
ON CONFLICT (email) DO NOTHING;

-- Seed Touchpoints and Interactions
INSERT INTO interactions (customer_id, interaction_date, channel, notes, sentiment)
VALUES
    (1, CURRENT_DATE - INTERVAL '2 days', 'meeting', 'Quarterly roadmap alignment meeting. Client delighted with CRM adoption.', 'positive'),
    (1, CURRENT_DATE - INTERVAL '15 days', 'email', 'Shared release notes for upcoming reporting features.', 'neutral'),
    (2, CURRENT_DATE - INTERVAL '4 days', 'call', 'Support check-in regarding webhook latency. Issue resolved in 10 mins.', 'positive'),
    (2, CURRENT_DATE - INTERVAL '25 days', 'meeting', 'Account review and SLA compliance discussion.', 'positive'),
    (3, CURRENT_DATE - INTERVAL '12 days', 'email', 'Sent standard introductory onboarding kit and API docs.', 'neutral'),
    (4, CURRENT_DATE - INTERVAL '35 days', 'call', 'Brief check-in call. Point of contact noted upcoming team reorganization.', 'neutral'),
    (5, CURRENT_DATE - INTERVAL '65 days', 'email', 'Renewal notification sent. Awaiting feedback from finance controller.', 'negative'),
    (6, CURRENT_DATE - INTERVAL '1 day', 'meeting', 'Product demonstration for executive steering committee.', 'positive'),
    (7, CURRENT_DATE - INTERVAL '40 days', 'call', 'Initial lead inquiry about API limits and webhook capabilities.', 'neutral');

-- Seed Sample Follow-ups
INSERT INTO followups (customer_id, action_type, priority_level, scheduled_date, status, resolution_notes)
VALUES
    (5, 'ESCALATE_MANAGER', 'CRITICAL', CURRENT_DATE, 'pending', 'Customer uncontacted for >60 days. Escalation triggered by AI engine.'),
    (4, 'CALL_CUSTOMER', 'HIGH', CURRENT_DATE, 'pending', 'Direct outreach to evaluate churn risk after reorganization.'),
    (7, 'SEND_EMAIL', 'MEDIUM', CURRENT_DATE + INTERVAL '1 day', 'pending', 'Re-engagement drip email scheduled.');
