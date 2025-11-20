-- Insert 10 topic slides with sequential order indices
INSERT INTO topic_slides (
  id,
  topic_id,
  order_index,
  kind,
  image_url,
  text_html,
  video_url,
  created_at,
  updated_at
)
VALUES
  (gen_random_uuid(), '96918191-8207-4041-b030-8181cc3b0779', 1, 'image', 'https://i.imgur.com/u1MZonD.jpeg', NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), '96918191-8207-4041-b030-8181cc3b0779', 2, 'image', 'https://i.imgur.com/u1MZonD.jpeg', NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), '96918191-8207-4041-b030-8181cc3b0779', 3, 'image', 'https://i.imgur.com/u1MZonD.jpeg', NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), '96918191-8207-4041-b030-8181cc3b0779', 4, 'image', 'https://i.imgur.com/u1MZonD.jpeg', NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), '96918191-8207-4041-b030-8181cc3b0779', 5, 'image', 'https://i.imgur.com/u1MZonD.jpeg', NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), '96918191-8207-4041-b030-8181cc3b0779', 6, 'image', 'https://i.imgur.com/u1MZonD.jpeg', NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), '96918191-8207-4041-b030-8181cc3b0779', 7, 'image', 'https://i.imgur.com/u1MZonD.jpeg', NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), '96918191-8207-4041-b030-8181cc3b0779', 8, 'image', 'https://i.imgur.com/u1MZonD.jpeg', NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), '96918191-8207-4041-b030-8181cc3b0779', 9, 'image', 'https://i.imgur.com/u1MZonD.jpeg', NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), '96918191-8207-4041-b030-8181cc3b0779', 10, 'image', 'https://i.imgur.com/u1MZonD.jpeg', NULL, NULL, NOW(), NOW());

