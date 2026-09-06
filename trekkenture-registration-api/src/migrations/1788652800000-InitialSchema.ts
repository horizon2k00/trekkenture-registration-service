import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1788652800000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE question_groups (
      id varchar(255) PRIMARY KEY,
      name varchar(255) NOT NULL,
      description text NOT NULL DEFAULT ''
    )`);
    await runner.query(`CREATE TABLE questions (
      id varchar(255) PRIMARY KEY,
      "groupId" varchar(255) NOT NULL REFERENCES question_groups(id) ON DELETE RESTRICT,
      question text NOT NULL,
      "fieldType" varchar NOT NULL,
      "answerType" varchar,
      options jsonb NOT NULL DEFAULT '[]'::jsonb,
      min varchar,
      max varchar
    )`);
    await runner.query(
      `CREATE TYPE events_status_enum AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED')`,
    );
    await runner.query(`CREATE TABLE events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(255) NOT NULL,
      slug varchar(255) NOT NULL UNIQUE,
      status events_status_enum NOT NULL DEFAULT 'DRAFT',
      questions jsonb NOT NULL,
      groups jsonb NOT NULL,
      "advancePayment" decimal(10,2),
      "totalPayment" decimal(10,2),
      "publishedAt" timestamptz,
      "closedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE TABLE submissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "eventId" uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      answers jsonb NOT NULL,
      "submittedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE INDEX "IDX_submissions_event_submitted"
      ON submissions ("eventId", "submittedAt")`);

    for (const group of initialGroups) {
      await runner.query(
        'INSERT INTO question_groups (id, name, description) VALUES ($1, $2, $3)',
        [group.id, group.name, group.description],
      );
    }
    for (const question of initialQuestions) {
      await runner.query(
        `INSERT INTO questions
        (id, "groupId", question, "fieldType", "answerType", options, min, max)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          question.id,
          question.groupId,
          question.question,
          question.fieldType,
          question.answerType,
          JSON.stringify(question.options),
          question.min,
          question.max,
        ],
      );
    }
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      'DROP TABLE submissions, events, questions, question_groups',
    );
    await runner.query('DROP TYPE events_status_enum');
  }
}

// Frozen initial content belongs to this migration, not to the live application.
const initialGroups = [
  {
    id: 'terms',
    name: 'Terms & Conditions',
    description:
      '- I have gone through the itinerary in detail and understand the instructions therein. I understand that the nature of the tour is of soft adventure where my son/daughter will be staying in remote areas in nature camps/tents on a group sharing basis.\n- I confirm my child is physically fit to go on such tours to forest and remote areas, with limited facilities.\n- I understand that there will be an additional cancellation charge of Rs. 1500 for dropping out after train bookings are done and up to ten days prior to travel. There will be no refunds for cancellations thereafter.\n- Cancellation Policy: An amount of Rs. 3000 will be deducted if cancellation is requested up to 10 days prior to travel. There will be no refunds thereafter.\n- I will not hold Trekkenture and/or the organizers responsible in case of eventuality, illness, accident, weather, political, or other factors beyond their control.\n\nImportant points:\n- No shorts or skirts to wear.\n- Wear well-covering tops/shirts.\n- No phones or electronic gadgets, including smart watches.\n- There will be no bath facility for the duration of the program.',
  },
  {
    id: 'student',
    name: 'Student Details',
    description: '',
  },
  {
    id: 'parent',
    name: 'Parent / Guardian Details',
    description: '',
  },
  {
    id: 'payment',
    name: 'Payment',
    description: '',
  },
];
const initialQuestions = [
  {
    id: 'terms.accepted',
    groupId: 'terms',
    question:
      'I have read and agree to the terms, conditions, and cancellation policy.',
    fieldType: 'checkbox',
    answerType: null,
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'student.fullName',
    groupId: 'student',
    question: 'Full Name (As on ID Card)',
    fieldType: 'text',
    answerType: 'string',
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'student.initialsName',
    groupId: 'student',
    question: 'Name with Initials (Train Booking)',
    fieldType: 'text',
    answerType: 'string',
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'student.age',
    groupId: 'student',
    question: 'Age',
    fieldType: 'text',
    answerType: 'number',
    options: [],
    min: '5',
    max: '25',
  },
  {
    id: 'student.dob',
    groupId: 'student',
    question: 'Date of Birth',
    fieldType: 'text',
    answerType: 'date',
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'student.gender',
    groupId: 'student',
    question: 'Gender',
    fieldType: 'dropdown',
    answerType: null,
    options: ['Male', 'Female', 'Other'],
    min: null,
    max: null,
  },
  {
    id: 'student.section',
    groupId: 'student',
    question: 'Section',
    fieldType: 'dropdown',
    answerType: null,
    options: ['A', 'B', 'C', 'D', 'E', 'F'],
    min: null,
    max: null,
  },
  {
    id: 'student.medicalConditions',
    groupId: 'student',
    question: 'Allergies / Medical Conditions',
    fieldType: 'text',
    answerType: 'string',
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'student.email',
    groupId: 'student',
    question: 'Student Email',
    fieldType: 'text',
    answerType: 'email',
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'student.mobile',
    groupId: 'student',
    question: 'Student Mobile',
    fieldType: 'text',
    answerType: 'phone',
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'parent.primaryName',
    groupId: 'parent',
    question: 'Primary Parent Name',
    fieldType: 'text',
    answerType: 'string',
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'parent.primaryEmail',
    groupId: 'parent',
    question: 'Primary Parent Email',
    fieldType: 'text',
    answerType: 'email',
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'parent.primaryMobile',
    groupId: 'parent',
    question: 'Primary Parent Mobile',
    fieldType: 'text',
    answerType: 'phone',
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'parent.secondaryName',
    groupId: 'parent',
    question: 'Secondary Parent Name',
    fieldType: 'text',
    answerType: 'string',
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'parent.secondaryEmail',
    groupId: 'parent',
    question: 'Secondary Parent Email',
    fieldType: 'text',
    answerType: 'email',
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'parent.secondaryMobile',
    groupId: 'parent',
    question: 'Secondary Parent Mobile',
    fieldType: 'text',
    answerType: 'phone',
    options: [],
    min: null,
    max: null,
  },
  {
    id: 'payment.utr',
    groupId: 'payment',
    question: 'UTR / Transaction Reference Number',
    fieldType: 'text',
    answerType: 'string',
    options: [],
    min: null,
    max: null,
  },
];
