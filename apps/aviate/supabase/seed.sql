-- Aviate dev seed: Menzies-shaped demo data.
-- After your first sign-up, attach yourself to the org as admin:
--   update profiles
--   set org_id = (select id from organisations where slug = 'menzies'), role = 'admin'
--   where email = 'you@example.com';

insert into organisations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Menzies Aviation', 'menzies');

insert into stations (id, org_id, iata_code, icao_code, name, timezone) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'MEL', 'YMML', 'Melbourne Airport', 'Australia/Melbourne'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'SYD', 'YSSY', 'Sydney Airport', 'Australia/Sydney');

insert into departments (id, org_id, station_id, name, kind) values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Ramp', 'ramp'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Passenger Services', 'passenger_services'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Cargo', 'cargo'),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'Ramp', 'ramp'),
  ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'Fueling', 'fueling');

insert into employees (org_id, employee_code, full_name, email, station_id, department_id, job_title, employment_type) values
  ('00000000-0000-0000-0000-000000000001', 'MEL001', 'Priya Sharma', 'priya.sharma@example.com', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000021', 'Ramp Agent', 'full_time'),
  ('00000000-0000-0000-0000-000000000001', 'MEL002', 'Jack Nguyen', 'jack.nguyen@example.com', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000021', 'Ramp Team Leader', 'full_time'),
  ('00000000-0000-0000-0000-000000000001', 'MEL003', 'Sofia Rossi', 'sofia.rossi@example.com', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000022', 'Customer Service Agent', 'part_time'),
  ('00000000-0000-0000-0000-000000000001', 'MEL004', 'Dev Patel', 'dev.patel@example.com', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000023', 'Cargo Handler', 'casual'),
  ('00000000-0000-0000-0000-000000000001', 'MEL005', 'Grace Chen', 'grace.chen@example.com', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000022', 'Passenger Services Supervisor', 'full_time'),
  ('00000000-0000-0000-0000-000000000001', 'SYD001', 'Liam O''Connor', 'liam.oconnor@example.com', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000024', 'Ramp Agent', 'full_time'),
  ('00000000-0000-0000-0000-000000000001', 'SYD002', 'Aisha Khan', 'aisha.khan@example.com', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000025', 'Refueling Operator', 'full_time');

insert into certifications (org_id, name, description, validity_months) values
  ('00000000-0000-0000-0000-000000000001', 'ASIC', 'Aviation Security Identification Card', 24),
  ('00000000-0000-0000-0000-000000000001', 'Dangerous Goods Awareness', 'IATA DG awareness training', 24),
  ('00000000-0000-0000-0000-000000000001', 'Airside Driving Authority', 'ADA for airside vehicle operation', 12);

insert into shift_templates (org_id, station_id, department_id, name, start_time, end_time, required_headcount) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000021', 'Early Ramp', '04:30', '13:00', 4),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000021', 'Late Ramp', '12:30', '21:00', 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000022', 'AM Check-in', '05:00', '13:30', 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000023', 'Overnight Cargo', '22:00', '06:00', 2);

-- ---------------------------------------------------------------------------
-- Requests & approvals demo data (the digitised paper forms).
-- After sign-up, link yourself to an employee so "My Requests" and the approver
-- inbox resolve to a real person, e.g.:
--   update employees set profile_id = (select id from profiles where email = 'you@example.com')
--   where employee_code = 'MEL005';
-- ---------------------------------------------------------------------------

do $$
declare
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_mel uuid := '00000000-0000-0000-0000-000000000011';
  v_syd uuid := '00000000-0000-0000-0000-000000000012';
  d_ramp uuid := '00000000-0000-0000-0000-000000000021';
  d_pax uuid := '00000000-0000-0000-0000-000000000022';
  d_cargo uuid := '00000000-0000-0000-0000-000000000023';
  d_syd_ramp uuid := '00000000-0000-0000-0000-000000000024';
  emp_priya uuid; emp_jack uuid; emp_sofia uuid; emp_dev uuid; emp_grace uuid; emp_liam uuid;
  r uuid;
begin
  select id into emp_priya from employees where employee_code = 'MEL001';
  select id into emp_jack from employees where employee_code = 'MEL002';
  select id into emp_sofia from employees where employee_code = 'MEL003';
  select id into emp_dev from employees where employee_code = 'MEL004';
  select id into emp_grace from employees where employee_code = 'MEL005';
  select id into emp_liam from employees where employee_code = 'SYD001';

  insert into requests (org_id,kind,employee_id,station_id,department_id,reference,title,payload,status,current_step,submitted_at)
  values (v_org,'leave_application',emp_priya,v_mel,d_ramp,'MEL-LEAVE-0001','Annual Leave · 17–30 Aug 2026',
    jsonb_build_object('leaveType','Annual Leave','startDate','2026-08-17','endDate','2026-08-30','hours',76,'returnDate','2026-08-31','certificateAttached',false,'publicHolidays',0,'payHolidays','as_normal','reason','Family holiday to Vietnam'),
    'submitted',1, now() - interval '2 days') returning id into r;
  insert into request_approvals (org_id,request_id,step_order,role,label) values
    (v_org,r,1,'supervisor','Supervisor'),(v_org,r,2,'dept_manager','Department Manager'),(v_org,r,3,'payroll','Payroll · ESP entry');

  insert into requests (org_id,kind,employee_id,station_id,department_id,reference,title,payload,status,current_step,submitted_at)
  values (v_org,'shift_swap',emp_dev,v_mel,d_cargo,'MEL-SWAP-0007','Shift swap with Jack Nguyen',
    jsonb_build_object('requesteeEmployeeId',emp_jack,'requesteeName','Jack Nguyen','rosteredDate','2026-07-24','rosteredTime','22:00–06:00','requestedDate','2026-07-26','requestedTime','12:30–21:00','reason','Medical appointment'),
    'submitted',1, now() - interval '1 day') returning id into r;
  insert into request_approvals (org_id,request_id,step_order,role,label,assignee_employee_id) values (v_org,r,1,'requestee','Shift counterparty',emp_jack);
  insert into request_approvals (org_id,request_id,step_order,role,label) values (v_org,r,2,'supervisor','Supervisor'),(v_org,r,3,'manager','Manager / Allocator');

  insert into requests (org_id,kind,employee_id,station_id,department_id,reference,title,payload,status,current_step,submitted_at)
  values (v_org,'change_of_details',emp_grace,v_mel,d_pax,'MEL-CHG-0003','Update bank details & mobile',
    jsonb_build_object('categories',jsonb_build_array('bank','personal'),'bank',jsonb_build_object('institution','Commonwealth Bank','bsb','063-000','accountName','G Chen'),'personal',jsonb_build_object('phone','0412 555 019')),
    'submitted',1, now() - interval '5 hours') returning id into r;
  insert into request_approvals (org_id,request_id,step_order,role,label) values (v_org,r,1,'hr','HR / Payroll · 3-point ID verification');

  insert into requests (org_id,kind,employee_id,station_id,department_id,reference,title,payload,status,current_step,submitted_at,resolved_at,resolution_note)
  values (v_org,'leave_application',emp_sofia,v_mel,d_pax,'MEL-LEAVE-0002','Sick Leave · 02–03 Jul 2026',
    jsonb_build_object('leaveType','Sick Leave','startDate','2026-07-02','endDate','2026-07-03','hours',15,'returnDate','2026-07-04','certificateAttached',true,'publicHolidays',0,'payHolidays','as_normal','reason','Flu, medical certificate attached'),
    'actioned',4, now() - interval '14 days', now() - interval '12 days','Recorded in payroll and ESP.') returning id into r;
  insert into request_approvals (org_id,request_id,step_order,role,label,decision,decided_at,signature_name) values
    (v_org,r,1,'supervisor','Supervisor','approved', now() - interval '13 days','G. Chen'),
    (v_org,r,2,'dept_manager','Department Manager','approved', now() - interval '13 days','M. Bianchi'),
    (v_org,r,3,'payroll','Payroll · ESP entry','approved', now() - interval '12 days','Payroll');

  insert into requests (org_id,kind,employee_id,station_id,department_id,reference,title,payload,status,current_step,submitted_at)
  values (v_org,'pay_query',emp_dev,v_mel,d_cargo,'MEL-PAY-0011','Sunday hours underpaid · 16 Jun pay',
    jsonb_build_object('payslipDate','2026-06-16','normalHoursIncorrect',false,'doubleHoursIncorrect',false,'sundayHoursIncorrect',true,'description','Worked 8h Sunday 08 Jun, paid at base not double time.'),
    'submitted',1, now() - interval '3 days') returning id into r;
  insert into request_approvals (org_id,request_id,step_order,role,label) values (v_org,r,1,'payroll','Payroll');

  insert into requests (org_id,kind,employee_id,station_id,department_id,reference,title,payload,status,current_step,submitted_at,resolved_at,resolution_note)
  values (v_org,'uniform_order',emp_liam,v_syd,d_syd_ramp,'SYD-UNI-0004','Uniform order · 3 items',
    jsonb_build_object('lines',jsonb_build_array(
      jsonb_build_object('garment','Polo Shirt S/SL Hi-Vis','colour','Yellow','size','L','qty',2),
      jsonb_build_object('garment','Cargo/Ramp Trouser','colour','Navy','size','34','qty',2),
      jsonb_build_object('garment','Hi-Vis Padded Jacket','colour','Yellow','size','XL','qty',1)),
      'comments','Replacement for worn kit.'),
    'actioned',1, now() - interval '20 days', now() - interval '6 days','Ordered 04 Jul, received 10 Jul.') returning id into r;
  insert into request_approvals (org_id,request_id,step_order,role,label,decision,decided_at,signature_name) values
    (v_org,r,1,'manager','Office / Stores','approved', now() - interval '6 days','Stores');
end $$;
