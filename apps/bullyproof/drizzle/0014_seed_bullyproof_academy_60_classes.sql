-- Seed 60 classes for Bullyproof Academy, evenly spread across P, 1/2, 3/4, 5/6, 7-12.
-- Naming: Number + Colour — 60 unique colour names (no colour reused).
-- Replaces existing Bullyproof classes.

-- Step 1: Remove existing Bullyproof Academy classes and dependencies
DELETE FROM lesson_classes
WHERE class_id IN (SELECT id FROM classes WHERE school_id = (SELECT id FROM schools WHERE slug = 'bullyproof-academy'));

DELETE FROM teacher_classes
WHERE class_id IN (SELECT id FROM classes WHERE school_id = (SELECT id FROM schools WHERE slug = 'bullyproof-academy'));

DELETE FROM class_years
WHERE class_id IN (SELECT id FROM classes WHERE school_id = (SELECT id FROM schools WHERE slug = 'bullyproof-academy'));

DELETE FROM classes
WHERE school_id = (SELECT id FROM schools WHERE slug = 'bullyproof-academy');

-- Step 2 & 3: Insert 60 classes and create class_years links
WITH school_ref AS (
  SELECT id FROM schools WHERE slug = 'bullyproof-academy'
),
inserted AS (
  INSERT INTO classes (school_id, name, code, active)
  SELECT s.id, v.name, v.name, true
  FROM school_ref s
  CROSS JOIN (VALUES
    ('P Red'), ('P Orange'), ('P Yellow'), ('P Green'), ('P Blue'), ('P Purple'),
    ('1/2 Pink'), ('1/2 Teal'), ('1/2 Navy'), ('1/2 Gold'), ('1/2 Silver'), ('1/2 Coral'),
    ('3/4 Crimson'), ('3/4 Amber'), ('3/4 Lime'), ('3/4 Turquoise'), ('3/4 Violet'), ('3/4 Maroon'),
    ('5/6 Scarlet'), ('5/6 Bronze'), ('5/6 Olive'), ('5/6 Cyan'), ('5/6 Indigo'), ('5/6 Burgundy'),
    ('7 Vermillion'), ('7 Copper'), ('7 Emerald'), ('7 Aqua'), ('7 Lavender'), ('7 Ruby'),
    ('8 Saffron'), ('8 Jade'), ('8 Mint'), ('8 Cobalt'), ('8 Magenta'), ('8 Rose'),
    ('9 Tangerine'), ('9 Forest'), ('9 Sage'), ('9 Azure'), ('9 Orchid'), ('9 Cerise'),
    ('10 Peach'), ('10 Slate'), ('10 Charcoal'), ('10 Sky'), ('10 Fuchsia'), ('10 Grape'),
    ('11 Salmon'), ('11 Platinum'), ('11 Ivory'), ('11 Denim'), ('11 Mauve'), ('11 Umber'),
    ('12 Cream'), ('12 Tan'), ('12 Chocolate'), ('12 Steel'), ('12 Honey'), ('12 Beige')
  ) AS v(name)
  RETURNING id, name
),
year_links AS (
  SELECT i.id AS class_id, sy.id AS school_year_id
  FROM inserted i
  JOIN school_years sy ON (
    (i.name LIKE 'P %' AND sy.code = 'P') OR
    (i.name LIKE '1/2 %' AND sy.code IN ('1', '2')) OR
    (i.name LIKE '3/4 %' AND sy.code IN ('3', '4')) OR
    (i.name LIKE '5/6 %' AND sy.code IN ('5', '6')) OR
    (i.name LIKE '7 %' AND sy.code = '7') OR
    (i.name LIKE '8 %' AND sy.code = '8') OR
    (i.name LIKE '9 %' AND sy.code = '9') OR
    (i.name LIKE '10 %' AND sy.code = '10') OR
    (i.name LIKE '11 %' AND sy.code = '11') OR
    (i.name LIKE '12 %' AND sy.code = '12')
  )
)
INSERT INTO class_years (class_id, school_year_id)
SELECT class_id, school_year_id FROM year_links;
