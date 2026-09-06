import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import * as ExcelJS from 'exceljs';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { databaseOptions } from '../src/database.config';

jest.setTimeout(120_000);

describe('registration flow with a temporary PostgreSQL database', () => {
  const databaseName = `trekkenture_test_${randomUUID().replace(/-/g, '')}`;
  const password = 'e2e-only-password';
  const originalEnvironment = { ...process.env };
  let adminDatabase: Client;
  let databaseCreated = false;
  let migrationDatabase: DataSource;
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    adminDatabase = new Client({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: 'postgres',
    });
    await adminDatabase.connect();
    // Only a generated test database is created or dropped. Existing data is untouched.
    if (!/^trekkenture_test_[a-f0-9]{32}$/.test(databaseName)) {
      throw new Error('Unexpected test database name');
    }
    await adminDatabase.query(`CREATE DATABASE "${databaseName}"`);
    databaseCreated = true;
    Object.assign(process.env, {
      DB_NAME: databaseName,
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: password,
      JWT_SECRET: randomUUID(),
      UPI_ID: 'test@upi',
      UPI_PAYEE_NAME: 'Test Trekkenture',
      DB_LOGGING: 'false',
      SMTP_HOST: '',
      SMTP_USER: '',
      SMTP_PASS: '',
    });

    migrationDatabase = new DataSource({
      ...databaseOptions(),
      type: 'postgres',
      database: databaseName,
    });
    await migrationDatabase.initialize();
    expect(
      (await migrationDatabase.runMigrations()).map(
        (migration) => migration.name,
      ),
    ).toEqual(['InitialSchema1788652800000']);
    // Exercise a clean rollback and setup again before starting the API.
    await migrationDatabase.undoLastMigration();
    expect(
      await migrationDatabase.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
      ),
    ).toEqual([{ tablename: 'migrations' }]);
    expect(await migrationDatabase.query('SELECT * FROM migrations')).toEqual(
      [],
    );
    expect(await migrationDatabase.runMigrations()).toHaveLength(1);
    await migrationDatabase.destroy();

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password })
      .expect(201);
    token = login.body.access_token;
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
      if (migrationDatabase?.isInitialized) await migrationDatabase.destroy();
      if (databaseCreated)
        await adminDatabase.query(`DROP DATABASE "${databaseName}"`);
    } finally {
      if (adminDatabase) await adminDatabase.end();
      for (const key of Object.keys(process.env)) {
        if (!(key in originalEnvironment)) delete process.env[key];
      }
      Object.assign(process.env, originalEnvironment);
    }
  });

  const admin = (
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);

  async function createGroup(name: string) {
    const response = await admin('post', '/admin/question-groups')
      .send({ name, description: 'Information for this group' })
      .expect(201);
    return response.body;
  }

  async function createQuestion(
    groupId: string,
    question: string,
    settings = {},
  ) {
    const response = await admin('post', '/admin/questions')
      .send({
        groupId,
        question,
        fieldType: 'text',
        answerType: 'string',
        options: [],
        min: null,
        max: null,
        ...settings,
      })
      .expect(201);
    return response.body;
  }

  it('rejects incorrect passwords and protects the admin routes', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'wrong-password' })
      .expect(401);
    for (const path of [
      '/admin/forms',
      '/admin/forms/payment-settings',
      '/admin/form-catalog',
      `/admin/forms/${randomUUID()}/submissions/export`,
    ]) {
      await request(app.getHttpServer()).get(path).expect(401);
    }
    await request(app.getHttpServer())
      .post('/admin/question-groups')
      .send({ name: 'Unauthorized' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/admin/questions')
      .send({})
      .expect(401);
  });

  it('creates only the current tables and skips an already-applied migration', async () => {
    const database = app.get(DataSource);
    expect(
      await database.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
      ),
    ).toEqual(
      [
        'events',
        'migrations',
        'question_groups',
        'questions',
        'submissions',
      ].map((tablename) => ({ tablename })),
    );
    expect(
      await database.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' ORDER BY column_name",
      ),
    ).toEqual(
      [
        'advancePayment',
        'closedAt',
        'createdAt',
        'groups',
        'id',
        'name',
        'publishedAt',
        'questions',
        'slug',
        'status',
        'totalPayment',
        'updatedAt',
      ].map((column_name) => ({ column_name })),
    );
    expect(await database.query('SELECT name FROM migrations')).toEqual([
      { name: 'InitialSchema1788652800000' },
    ]);
    expect(await database.runMigrations()).toEqual([]);
    expect(await database.query('SELECT id FROM events')).toEqual([]);
    expect(await database.query('SELECT id FROM submissions')).toEqual([]);
  });

  it('seeds the database with the original groups and questions', async () => {
    const catalog = await admin('get', '/admin/form-catalog').expect(200);
    expect(catalog.body.groups).toHaveLength(4);
    expect(catalog.body.questions).toHaveLength(17);
    expect(
      catalog.body.questions.find((question) => question.id === 'student.age'),
    ).toMatchObject({ min: '5', max: '25' });
    expect(
      catalog.body.questions.find(
        (question) => question.id === 'terms.accepted',
      ),
    ).toMatchObject({ fieldType: 'checkbox', options: [] });
    expect(catalog.body.groups.map((group) => group.id)).toEqual(
      expect.arrayContaining(['terms', 'student', 'parent', 'payment']),
    );
    expect(catalog.body.questions.map((question) => question.id)).toEqual(
      expect.arrayContaining([
        'terms.accepted',
        'student.fullName',
        'student.section',
        'parent.primaryEmail',
        'payment.utr',
      ]),
    );
    const database = app.get(DataSource);
    const questions = await database.query('SELECT id FROM questions');
    const groups = await database.query('SELECT id FROM question_groups');
    expect(questions.map((question) => question.id).sort()).toEqual(
      catalog.body.questions.map((question) => question.id).sort(),
    );
    expect(groups.map((group) => group.id).sort()).toEqual(
      catalog.body.groups.map((group) => group.id).sort(),
    );
  });

  it('supports group and question CRUD and rejects invalid configuration', async () => {
    const group = await createGroup('Equipment');
    const question = await createQuestion(group.id, 'Shoe size', {
      answerType: 'number',
      min: '10',
      max: '50',
    });
    await admin('put', `/admin/question-groups/${group.id}`)
      .send({
        name: 'Equipment details',
        description: 'Bring your own equipment.',
      })
      .expect(200);
    await admin('put', `/admin/questions/${question.id}`)
      .send({
        groupId: group.id,
        question: 'Boot size',
        fieldType: 'text',
        answerType: 'number',
        options: [],
        min: '20',
        max: '48',
      })
      .expect(200);
    const catalog = await admin('get', '/admin/form-catalog').expect(200);
    expect(catalog.body.groups.find((item) => item.id === group.id).name).toBe(
      'Equipment details',
    );
    expect(
      catalog.body.questions.find((item) => item.id === question.id),
    ).toMatchObject({ question: 'Boot size', min: '20', max: '48' });
    await admin('delete', `/admin/question-groups/${group.id}`).expect(409);
    for (const invalid of [
      { answerType: 'number', min: '50', max: '10' },
      { answerType: 'date', min: '2026-02-30' },
      { fieldType: 'unsupported' },
      { fieldType: 'checkbox', answerType: null, options: ['Yes', 'No'] },
    ]) {
      await admin('post', '/admin/questions')
        .send({
          groupId: group.id,
          question: 'Invalid',
          fieldType: 'text',
          answerType: 'string',
          ...invalid,
        })
        .expect(400);
    }
    await admin('put', `/admin/questions/${question.id}`)
      .send({
        groupId: group.id,
        question: 'Invalid checkbox',
        fieldType: 'checkbox',
        answerType: null,
        options: ['Yes'],
      })
      .expect(400);
    await admin('delete', `/admin/questions/${question.id}`).expect(204);
    await admin('delete', `/admin/question-groups/${group.id}`).expect(204);
    const remaining = await admin('get', '/admin/form-catalog').expect(200);
    expect(
      remaining.body.questions.some((item) => item.id === question.id),
    ).toBe(false);
    expect(remaining.body.groups.some((item) => item.id === group.id)).toBe(
      false,
    );
  });

  it('saves incomplete drafts but requires questions and choice options to publish', async () => {
    const draft = await admin('post', '/admin/forms')
      .send({
        name: 'Incomplete draft',
        slug: 'incomplete-draft',
        questions: [],
      })
      .expect(201);
    const id = draft.body.id;
    expect(draft.body.status).toBe('DRAFT');
    await request(app.getHttpServer())
      .get('/forms/incomplete-draft')
      .expect(404);
    await admin('post', `/admin/forms/${id}/publish`).expect(400);
    const group = await createGroup('Unfinished choices');
    for (const fieldType of ['dropdown', 'radio']) {
      const question = await createQuestion(
        group.id,
        `Unfinished ${fieldType}`,
        { fieldType, answerType: null },
      );
      await admin('patch', `/admin/forms/${id}`)
        .send({
          name: 'Incomplete draft',
          slug: 'incomplete-draft',
          questions: [{ id: question.id, required: false }],
        })
        .expect(200);
      await admin('post', `/admin/forms/${id}/publish`).expect(400);
    }
  });

  it('keeps saved question order aligned with the public group layout', async () => {
    const created = await admin('post', '/admin/forms')
      .send({
        name: 'Grouped questions',
        slug: 'grouped-questions',
        questions: [
          { id: 'student.fullName', required: true },
          { id: 'parent.primaryName', required: true },
          { id: 'student.age', required: false },
        ],
      })
      .expect(201);
    expect(created.body.groups.map((group) => group.id)).toEqual([
      'student',
      'parent',
    ]);
    expect(created.body.questions.map((question) => question.id)).toEqual([
      'student.fullName',
      'student.age',
      'parent.primaryName',
    ]);
    await admin('post', `/admin/forms/${created.body.id}/publish`).expect(201);
    const form = await request(app.getHttpServer())
      .get('/forms/grouped-questions')
      .expect(200);
    const renderedOrder = form.body.groups.flatMap((group) =>
      form.body.questions
        .filter((question) => question.groupId === group.id)
        .map((question) => question.id),
    );
    expect(renderedOrder).toEqual(
      created.body.questions.map((question) => question.id),
    );
  });

  it('saves explicit group order and unfinished groups, then keeps public and Excel order aligned', async () => {
    const input = {
      name: 'Ordered groups',
      slug: 'ordered-groups',
      groupIds: ['parent', 'student'],
      questions: [{ id: 'student.fullName', required: true }],
    };
    const created = await admin('post', '/admin/forms').send(input).expect(201);
    const id = created.body.id;
    expect(created.body.groups.map((group) => group.id)).toEqual([
      'parent',
      'student',
    ]);
    const saved = await admin('get', `/admin/forms/${id}`).expect(200);
    expect(saved.body.groups).toEqual(created.body.groups);
    await admin('post', `/admin/forms/${id}/publish`).expect(400);
    for (const groupIds of [
      ['student', 'student'],
      ['missing'],
      [],
      ['parent'],
    ]) {
      await admin('patch', `/admin/forms/${id}`)
        .send({ ...input, groupIds })
        .expect(400);
    }
    await admin('post', '/admin/forms')
      .send({ ...input, groupIds: ['payment'], questions: [] })
      .expect(400);

    const questions = [
      ...input.questions,
      { id: 'parent.primaryName', required: true },
    ];
    await admin('patch', `/admin/forms/${id}`)
      .send({ ...input, questions, groupIds: ['student', 'parent'] })
      .expect(200);
    const reordered = await admin('patch', `/admin/forms/${id}`)
      .send({ ...input, questions })
      .expect(200);
    expect(reordered.body.questions.map((question) => question.id)).toEqual([
      'parent.primaryName',
      'student.fullName',
    ]);
    await admin('post', `/admin/forms/${id}/publish`).expect(201);
    const form = await request(app.getHttpServer())
      .get('/forms/ordered-groups')
      .expect(200);
    expect(form.body.groups.map((group) => group.id)).toEqual([
      'parent',
      'student',
    ]);
    await request(app.getHttpServer())
      .post('/forms/ordered-groups/submissions')
      .send({
        answers: {
          'student.fullName': 'Student',
          'parent.primaryName': 'Parent',
        },
      })
      .expect(201);
    const exported = await admin('get', `/admin/forms/${id}/submissions/export`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(exported.body);
    const sheet = workbook.getWorksheet('Submissions')!;
    expect(sheet.getRow(1).values).toEqual([
      ,
      'Submission ID',
      'Submitted At',
      'Primary Parent Name',
      'Full Name (As on ID Card)',
    ]);
    expect(sheet.getRow(2).getCell(3).value).toBe('Parent');
    expect(sheet.getRow(2).getCell(4).value).toBe('Student');
  });

  it('copies, overrides and clears numeric/date limits and validates public answers against the form', async () => {
    const group = await createGroup('Limits');
    const number = await createQuestion(group.id, 'Count', {
      answerType: 'number',
      min: '10',
      max: '20',
    });
    const date = await createQuestion(group.id, 'Day', {
      answerType: 'date',
      min: '2026-01-01',
      max: '2026-12-31',
    });
    const input = {
      name: 'Form limits',
      slug: 'form-limits',
      groupIds: [group.id],
      questions: [
        { id: number.id, required: true },
        { id: date.id, required: true },
      ],
    };
    const created = await admin('post', '/admin/forms').send(input).expect(201);
    const id = created.body.id;
    expect(created.body.questions[0]).toMatchObject({ min: '10', max: '20' });
    expect(created.body.questions[1]).toMatchObject({
      min: '2026-01-01',
      max: '2026-12-31',
    });
    const overrides = [
      { ...input.questions[0], min: '0', max: '5' },
      { ...input.questions[1], min: '2026-02-01', max: '2026-02-28' },
    ];
    await admin('patch', `/admin/forms/${id}`)
      .send({ ...input, questions: overrides })
      .expect(200);
    const retained = await admin('patch', `/admin/forms/${id}`)
      .send(input)
      .expect(200);
    expect(retained.body.questions[0]).toMatchObject({ min: '0', max: '5' });
    expect(retained.body.questions[1]).toMatchObject({
      min: '2026-02-01',
      max: '2026-02-28',
    });
    const cleared = await admin('patch', `/admin/forms/${id}`)
      .send({
        ...input,
        questions: input.questions.map((q) => ({ ...q, min: null, max: null })),
      })
      .expect(200);
    expect(
      cleared.body.questions.every((q) => q.min === null && q.max === null),
    ).toBe(true);
    const normalized = await admin('patch', `/admin/forms/${id}`)
      .send({
        ...input,
        questions: [{ ...overrides[0], min: '0x0', max: '5e0' }, overrides[1]],
      })
      .expect(200);
    expect(normalized.body.questions[0]).toMatchObject({ min: '0', max: '5' });
    for (const bounds of [
      { min: '6', max: '5' },
      { min: 'Infinity' },
      { max: 'abc' },
      { min: 0 },
    ]) {
      await admin('patch', `/admin/forms/${id}`)
        .send({
          ...input,
          questions: [{ ...overrides[0], ...bounds }, overrides[1]],
        })
        .expect(400);
    }
    for (const bounds of [
      { min: '2026-02-29' },
      { max: 'not-a-date' },
      { min: '2026-03-01', max: '2026-02-28' },
    ]) {
      await admin('patch', `/admin/forms/${id}`)
        .send({
          ...input,
          questions: [overrides[0], { ...overrides[1], ...bounds }],
        })
        .expect(400);
    }
    await admin('post', '/admin/forms')
      .send({
        name: 'Invalid text limit',
        slug: 'invalid-text-limit',
        questions: [{ id: 'student.fullName', required: true, min: '1' }],
      })
      .expect(400);
    const library = await admin('get', '/admin/form-catalog').expect(200);
    expect(
      library.body.questions.find((q) => q.id === number.id),
    ).toMatchObject({ min: '10', max: '20' });
    expect(library.body.questions.find((q) => q.id === date.id)).toMatchObject({
      min: '2026-01-01',
      max: '2026-12-31',
    });
    await admin('patch', `/admin/forms/${id}`)
      .send({ ...input, questions: overrides })
      .expect(200);
    await admin('post', `/admin/forms/${id}/publish`).expect(201);
    const publicForm = await request(app.getHttpServer())
      .get('/forms/form-limits')
      .expect(200);
    expect(publicForm.body.questions[0]).toMatchObject({ min: '0', max: '5' });
    expect(publicForm.body.questions[1]).toMatchObject({
      min: '2026-02-01',
      max: '2026-02-28',
    });
    for (const values of [
      [-1, '2026-02-15'],
      [6, '2026-02-15'],
      [3, '2026-01-31'],
      [3, '2026-03-01'],
    ]) {
      await request(app.getHttpServer())
        .post('/forms/form-limits/submissions')
        .send({ answers: { [number.id]: values[0], [date.id]: values[1] } })
        .expect(400);
    }
    for (const values of [
      [0, '2026-02-01'],
      [5, '2026-02-28'],
    ]) {
      await request(app.getHttpServer())
        .post('/forms/form-limits/submissions')
        .send({ answers: { [number.id]: values[0], [date.id]: values[1] } })
        .expect(201);
    }
  });

  it('permanently deletes only drafts and frees their slug', async () => {
    const input = {
      name: 'Delete draft',
      slug: 'delete-draft',
      groupIds: [],
      questions: [],
    };
    const created = await admin('post', '/admin/forms').send(input).expect(201);
    const id = created.body.id;
    await request(app.getHttpServer()).delete(`/admin/forms/${id}`).expect(401);
    await admin('get', `/admin/forms/${id}`).expect(200);
    await admin('delete', `/admin/forms/${id}`).expect(204);
    expect(
      await app
        .get(DataSource)
        .query('SELECT id FROM events WHERE id = $1', [id]),
    ).toEqual([]);
    await admin('get', `/admin/forms/${id}`).expect(404);
    await request(app.getHttpServer()).get('/forms/delete-draft').expect(404);
    await admin('delete', `/admin/forms/${id}`).expect(404);
    await admin('delete', '/admin/forms/not-a-uuid').expect(400);
    const reused = await admin('post', '/admin/forms')
      .send({
        ...input,
        groupIds: ['student'],
        questions: [{ id: 'student.fullName', required: true }],
      })
      .expect(201);
    await admin('post', `/admin/forms/${reused.body.id}/publish`).expect(201);
    await admin('delete', `/admin/forms/${reused.body.id}`).expect(409);
    await admin('post', `/admin/forms/${reused.body.id}/close`).expect(201);
    await admin('delete', `/admin/forms/${reused.body.id}`).expect(409);
    expect(
      (await admin('get', `/admin/forms/${reused.body.id}`).expect(200)).body
        .status,
    ).toBe('CLOSED');
    const catalog = await admin('get', '/admin/form-catalog').expect(200);
    expect(
      catalog.body.questions.some(
        (question) => question.id === 'student.fullName',
      ),
    ).toBe(true);
  });

  it('serializes draft deletion with publishing so a published form cannot be deleted', async () => {
    const created = await admin('post', '/admin/forms')
      .send({
        name: 'Delete race',
        slug: 'delete-race',
        questions: [{ id: 'student.fullName', required: true }],
      })
      .expect(201);
    const id = created.body.id;
    const [deleted, published] = await Promise.all([
      admin('delete', `/admin/forms/${id}`),
      admin('post', `/admin/forms/${id}/publish`),
    ]);
    const remaining = await admin('get', `/admin/forms/${id}`);
    if (deleted.status === 204) {
      expect(published.status).toBe(404);
      expect(remaining.status).toBe(404);
    } else {
      expect(deleted.status).toBe(409);
      expect(published.status).toBe(201);
      expect(remaining.body.status).toBe('PUBLISHED');
    }
  });

  it('saves an old checkbox snapshot as a boolean checkbox when options are omitted', async () => {
    const input = {
      name: 'Existing terms checkbox',
      slug: 'existing-terms-checkbox',
      questions: [{ id: 'terms.accepted', required: true }],
    };
    const created = await admin('post', '/admin/forms').send(input).expect(201);
    const id = created.body.id;
    // Simulate a draft saved by the previous checkbox-list implementation.
    const oldQuestions = created.body.questions.map((question) => ({
      ...question,
      options: ['Old checkbox option'],
    }));
    await app
      .get(DataSource)
      .query('UPDATE events SET questions = $1 WHERE id = $2', [
        JSON.stringify(oldQuestions),
        id,
      ]);
    const saved = await admin('patch', `/admin/forms/${id}`)
      .send(input)
      .expect(200);
    expect(saved.body.questions[0]).toMatchObject({
      fieldType: 'checkbox',
      options: [],
      required: true,
    });
    await admin('post', `/admin/forms/${id}/publish`).expect(201);
    const publicForm = await request(app.getHttpServer())
      .get('/forms/existing-terms-checkbox')
      .expect(200);
    expect(publicForm.body.questions[0].options).toEqual([]);
    await request(app.getHttpServer())
      .post('/forms/existing-terms-checkbox/submissions')
      .send({ answers: { 'terms.accepted': ['Old checkbox option'] } })
      .expect(400);
    await request(app.getHttpServer())
      .post('/forms/existing-terms-checkbox/submissions')
      .send({ answers: { 'terms.accepted': true } })
      .expect(201);
  });

  it('keeps payment amounts and a required transaction number together', async () => {
    const input = {
      name: 'Payment trip',
      slug: 'payment-trip',
      questions: [{ id: 'payment.utr', required: true }],
    };
    for (const amounts of [
      { advancePayment: 200, totalPayment: 100 },
      { advancePayment: -1, totalPayment: 100 },
    ]) {
      await admin('post', '/admin/forms')
        .send({ ...input, ...amounts })
        .expect(400);
    }
    const created = await admin('post', '/admin/forms')
      .send({ ...input, advancePayment: 100 })
      .expect(201);
    await admin('post', `/admin/forms/${created.body.id}/publish`).expect(400);
    await admin('patch', `/admin/forms/${created.body.id}`)
      .send({ ...input, advancePayment: 100, totalPayment: 250 })
      .expect(200);
    const upiId = process.env.UPI_ID;
    process.env.UPI_ID = '';
    try {
      await admin('post', `/admin/forms/${created.body.id}/publish`).expect(
        400,
      );
    } finally {
      process.env.UPI_ID = upiId;
    }
    await admin('post', `/admin/forms/${created.body.id}/publish`).expect(201);
    const form = await request(app.getHttpServer())
      .get('/forms/payment-trip')
      .expect(200);
    expect(form.body.payment).toMatchObject({
      advancePayment: 100,
      totalPayment: 250,
      upiId: 'test@upi',
      payeeName: 'Test Trekkenture',
    });
    const settings = await admin('get', '/admin/forms/payment-settings').expect(
      200,
    );
    expect(settings.body).toEqual({
      upiId: form.body.payment.upiId,
      payeeName: form.body.payment.payeeName,
      currency: form.body.payment.currency,
    });
    await request(app.getHttpServer())
      .post('/forms/payment-trip/submissions')
      .send({ answers: {} })
      .expect(400);
    await request(app.getHttpServer())
      .post('/forms/payment-trip/submissions')
      .send({ answers: { 'payment.utr': 'TEST-REFERENCE-123' } })
      .expect(201);
  });

  it('protects the Payment minimum while allowing extras and removal from a form', async () => {
    const extra = await createQuestion('payment', 'Receipt notes');
    await admin('delete', '/admin/questions/payment.utr').expect(409);
    await admin('delete', '/admin/question-groups/payment').expect(409);
    for (const change of [
      { groupId: 'student', fieldType: 'text', answerType: 'string' },
      { groupId: 'payment', fieldType: 'checkbox', answerType: null },
      { groupId: 'payment', fieldType: 'text', answerType: 'number' },
    ]) {
      await admin('put', '/admin/questions/payment.utr')
        .send({ question: 'Transaction number', ...change })
        .expect(400);
    }
    const input = {
      name: 'Optional payment',
      slug: 'optional-payment',
      questions: [{ id: 'payment.utr', required: true }],
    };
    for (const questions of [
      [],
      [{ id: extra.id, required: false }],
      [{ id: 'payment.utr', required: false }],
    ]) {
      await admin('post', '/admin/forms')
        .send({ ...input, questions, advancePayment: 100, totalPayment: 250 })
        .expect(400);
    }
    const created = await admin('post', '/admin/forms').send(input).expect(201);
    const id = created.body.id;
    await admin('post', `/admin/forms/${id}/publish`).expect(400);
    const configured = {
      ...input,
      advancePayment: 100,
      totalPayment: 250,
      questions: [...input.questions, { id: extra.id, required: false }],
    };
    await admin('patch', `/admin/forms/${id}`).send(configured).expect(200);
    await admin('patch', `/admin/forms/${id}`)
      .send({ ...configured, questions: [{ id: extra.id, required: false }] })
      .expect(400);
    await admin('patch', `/admin/forms/${id}`)
      .send({
        ...configured,
        questions: [{ id: 'payment.utr', required: false }],
      })
      .expect(400);
    await admin('patch', `/admin/forms/${id}`)
      .send({ ...configured, questions: input.questions })
      .expect(200);
    await admin('delete', `/admin/questions/${extra.id}`).expect(204);
    const removed = await admin('patch', `/admin/forms/${id}`)
      .send({
        ...input,
        questions: [{ id: 'student.fullName', required: true }],
        advancePayment: null,
        totalPayment: null,
      })
      .expect(200);
    expect(removed.body.groups.map((group) => group.id)).toEqual(['student']);
    expect(removed.body.advancePayment).toBeNull();
    expect(removed.body.totalPayment).toBeNull();
    await admin('post', `/admin/forms/${id}/publish`).expect(201);
    const form = await request(app.getHttpServer())
      .get('/forms/optional-payment')
      .expect(200);
    expect(form.body.payment).toBeUndefined();
    expect(
      form.body.questions.some((question) => question.id === 'payment.utr'),
    ).toBe(false);
  });

  it('keeps saved snapshots through catalog changes, validates submissions, exports Excel, and closes/reopens', async () => {
    const group = await createGroup('Trip preferences');
    const name = await createQuestion(group.id, 'Participant name');
    const age = await createQuestion(group.id, 'Age', {
      answerType: 'number',
      min: '5',
      max: '25',
    });
    const date = await createQuestion(group.id, 'Travel date', {
      answerType: 'date',
      min: '2026-01-01',
      max: '2026-12-31',
    });
    const travel = await createQuestion(group.id, 'Travel by', {
      fieldType: 'radio',
      answerType: null,
      options: ['Bus', 'Train'],
    });
    const updates = await createQuestion(group.id, 'Receive trip updates', {
      fieldType: 'checkbox',
      answerType: null,
    });
    const consent = await createQuestion(group.id, 'Accept conditions', {
      fieldType: 'checkbox',
      answerType: null,
    });
    const section = await createQuestion(group.id, 'Section', {
      fieldType: 'dropdown',
      answerType: null,
      options: ['A', 'B'],
    });
    const libraryQuestions = [
      name,
      age,
      date,
      travel,
      updates,
      consent,
      section,
    ];
    const questions = libraryQuestions.map((question) => ({
      id: question.id,
      required: question.id !== name.id && question.id !== updates.id,
      ...(question.id === travel.id ? { options: ['Flight', 'Bus'] } : {}),
      ...(question.id === section.id
        ? { options: ['Visitors', 'Custom'] }
        : {}),
    }));
    const input = {
      name: 'Configurable trip',
      slug: 'configurable-trip',
      questions,
      advancePayment: null,
      totalPayment: null,
    };
    await admin('post', '/admin/forms')
      .send({
        ...input,
        questions: [{ id: consent.id, required: true, options: ['Yes'] }],
      })
      .expect(400);
    const created = await admin('post', '/admin/forms').send(input).expect(201);
    const id = created.body.id;
    await admin('patch', `/admin/forms/${id}`)
      .send({
        ...input,
        questions: [{ id: consent.id, required: true, options: ['No'] }],
      })
      .expect(400);
    await request(app.getHttpServer())
      .get('/forms/configurable-trip')
      .expect(404);

    // Catalog edits and deletion must never rewrite a saved form's meaning.
    await admin('put', `/admin/questions/${name.id}`)
      .send({
        groupId: group.id,
        question: 'Changed catalog label',
        fieldType: 'text',
        answerType: 'number',
        options: [],
      })
      .expect(200);
    await admin('put', `/admin/question-groups/${group.id}`)
      .send({ name: 'Changed group', description: '' })
      .expect(200);
    for (const question of libraryQuestions)
      await admin('delete', `/admin/questions/${question.id}`).expect(204);
    await admin('delete', `/admin/question-groups/${group.id}`).expect(204);
    await admin('patch', `/admin/forms/${id}`).send(input).expect(200);
    await admin('post', `/admin/forms/${id}/publish`).expect(201);
    const form = await request(app.getHttpServer())
      .get('/forms/configurable-trip')
      .expect(200);
    expect(form.body.groups).toContainEqual(
      expect.objectContaining({ id: group.id, name: 'Trip preferences' }),
    );
    expect(form.body.questions.map((question) => question.question)).toEqual(
      libraryQuestions.map((question) => question.question),
    );
    expect(
      form.body.questions.find((question) => question.id === name.id),
    ).toMatchObject({ required: false, answerType: 'string' });
    expect(
      form.body.questions.find((question) => question.id === section.id)
        .options,
    ).toEqual(['Visitors', 'Custom']);
    expect(
      form.body.questions.find((question) => question.id === travel.id).options,
    ).toEqual(['Flight', 'Bus']);
    expect(
      form.body.questions.find((question) => question.id === updates.id),
    ).toMatchObject({ fieldType: 'checkbox', options: [], required: false });
    await admin('patch', `/admin/forms/${id}`).send(input).expect(409);

    const answers = {
      [name.id]: '  Test participant  ',
      [age.id]: 12,
      [date.id]: '2026-09-05',
      [travel.id]: 'Flight',
      [updates.id]: false,
      [consent.id]: true,
      [section.id]: 'Custom',
    };
    for (const invalid of [
      { unexpected: 'value' },
      { [name.id]: 123 },
      { [age.id]: '12' },
      { [age.id]: 4 },
      { [age.id]: 26 },
      { [date.id]: '2026-02-30' },
      { [date.id]: '2025-12-31' },
      { [date.id]: '2027-01-01' },
      { [travel.id]: 'Train' },
      { [updates.id]: ['Yes'] },
      { [updates.id]: [] },
      { [updates.id]: 'false' },
      { [updates.id]: 0 },
      { [consent.id]: false },
      { [consent.id]: ['true'] },
      { [consent.id]: null },
      { [section.id]: 'A' },
      { [age.id]: null },
    ]) {
      await request(app.getHttpServer())
        .post('/forms/configurable-trip/submissions')
        .send({ answers: { ...answers, ...invalid } })
        .expect(400);
    }
    const submitted = await request(app.getHttpServer())
      .post('/forms/configurable-trip/submissions')
      .send({ answers })
      .expect(201);
    const optionalAnswers = { ...answers };
    delete optionalAnswers[name.id];
    delete optionalAnswers[updates.id];
    const omittedCheckbox = await request(app.getHttpServer())
      .post('/forms/configurable-trip/submissions')
      .send({ answers: optionalAnswers })
      .expect(201);
    const responses = await admin(
      'get',
      `/admin/forms/${id}/submissions`,
    ).expect(200);
    expect(responses.body).toHaveLength(2);
    expect(
      responses.body.find(
        (response) => response.id === submitted.body.submissionId,
      ).answers,
    ).toEqual({ ...answers, [name.id]: 'Test participant' });
    expect(
      responses.body.find(
        (response) => response.id === omittedCheckbox.body.submissionId,
      ).answers,
    ).toEqual({ ...optionalAnswers, [updates.id]: false });

    const exported = await admin('get', `/admin/forms/${id}/submissions/export`)
      .buffer(true)
      .parse((response, done) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => done(null, Buffer.concat(chunks)));
        response.on('error', done);
      })
      .expect(
        'Content-Type',
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/,
      )
      .expect(200);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(exported.body);
    const sheet = workbook.worksheets[0];
    expect(sheet.rowCount).toBe(3);
    expect(sheet.getRow(1).values).toEqual([
      ,
      'Submission ID',
      'Submitted At',
      ...libraryQuestions.map((question) => question.question),
    ]);
    expect(sheet.getRow(2).values).toEqual([
      ,
      submitted.body.submissionId,
      expect.any(String),
      'Test participant',
      12,
      '2026-09-05',
      'Flight',
      'No',
      'Yes',
      'Custom',
    ]);
    expect(sheet.getRow(3).getCell(7).value).toBe('No');

    await admin('post', `/admin/forms/${id}/close`).expect(201);
    await request(app.getHttpServer())
      .post('/forms/configurable-trip/submissions')
      .send({ answers })
      .expect(410);
    const closed = await request(app.getHttpServer())
      .get('/forms/configurable-trip')
      .expect(200);
    expect(closed.body.status).toBe('CLOSED');
    await admin('post', `/admin/forms/${id}/reopen`).expect(201);
    const reopened = await request(app.getHttpServer())
      .get('/forms/configurable-trip')
      .expect(200);
    expect(reopened.body.questions).toEqual(form.body.questions);
    await request(app.getHttpServer())
      .post('/forms/configurable-trip/submissions')
      .send({ answers })
      .expect(201);
  });
});
