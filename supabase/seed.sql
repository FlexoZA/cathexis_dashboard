-- Seed data for testing the Cathexis Dashboard

-- Insert groups
INSERT INTO public.mvr_device_groups (name, description) VALUES
  ('Main Building', 'Security cameras in the main building'),
  ('Parking Areas', 'Cameras covering parking lots and garages'),
  ('Warehouse', 'Warehouse and loading dock cameras'),
  ('Perimeter', 'Perimeter security cameras');

-- Insert devices
INSERT INTO public.mvr_devices (serial, friendly_name, status, group_id, client_id) VALUES
  ('CAM-2024-001', 'Main Entrance Camera', 'online', 1, 1),
  ('CAM-2024-002', 'Parking Lot Camera', 'online', 2, 1),
  ('CAM-2024-003', 'Warehouse Camera', 'offline', 3, 1),
  ('CAM-2024-004', 'Loading Bay Camera', 'warning', 3, 1),
  ('CAM-2024-005', 'Reception Camera', 'maintenance', 1, 1),
  ('CAM-2024-006', 'Back Office Camera', 'online', 1, 1),
  ('CAM-2024-007', 'North Gate Camera', 'online', 4, 1),
  ('CAM-2024-008', 'South Gate Camera', 'online', 4, 1),
  ('CAM-2024-009', 'Employee Parking Camera', 'offline', 2, 1),
  ('CAM-2024-010', 'Loading Dock 1 Camera', 'online', 3, 1);

