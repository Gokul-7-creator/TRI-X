ALTER TABLE users
ADD COLUMN doctor_grade VARCHAR(12);

UPDATE users
SET doctor_grade = 'JUNIOR'
WHERE role = 'DOCTOR';

ALTER TABLE users
ADD CONSTRAINT ck_users_doctor_grade
CHECK (
    (role = 'DOCTOR' AND doctor_grade IN ('SENIOR', 'JUNIOR'))
    OR
    (role <> 'DOCTOR' AND doctor_grade IS NULL)
);
