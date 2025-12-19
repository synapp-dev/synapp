-- Seed certification stages
-- Foundation stage (C) - First stage of the certification program
-- Additional certification stages based on available courses

INSERT INTO certification_stages (code, name, sort_index)
VALUES
  ('C', 'Foundation', 1),
  ('C1', 'Advanced Intervention Strategies', 2),
  ('C2', 'Cyberbullying Prevention Specialist', 3),
  ('C3', 'School Culture Transformation', 4),
  ('C4', 'Peer Mediation Certification', 5)
ON CONFLICT (code) DO NOTHING;

