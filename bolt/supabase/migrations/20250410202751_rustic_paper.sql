/*
  # Create test school data

  1. Changes
    - Insert a test school for testing purposes
    
  2. Security
    - Uses existing RLS policies
    - Ensures idempotent insertion with ON CONFLICT
*/

-- Insert test school
INSERT INTO schools (id, name, website)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Test School',
  'https://test-school.edu'
) ON CONFLICT (id) DO NOTHING;