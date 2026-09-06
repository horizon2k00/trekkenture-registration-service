import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { downloadExport, storeToken } from './api';
import { FormCatalog, QuestionDefinition } from './types';
import { OptionsEditor } from './components/OptionsEditor';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const catalog: FormCatalog = {
  groups: [
    {
      id: 'student',
      name: 'Student Details',
      description: 'Please enter your details.',
    },
  ],
  questions: [
    {
      id: 'student.fullName',
      groupId: 'student',
      question: 'Full Name',
      fieldType: 'text',
      answerType: 'string',
      options: [],
      min: null,
      max: null,
    },
  ],
};

const paymentGroup = { id: 'payment', name: 'Payment', description: '' };
const paymentReference: QuestionDefinition = {
  ...catalog.questions[0],
  id: 'payment.utr',
  groupId: 'payment',
  question: 'Transaction number',
};
const paymentCatalog: FormCatalog = {
  groups: [...catalog.groups, paymentGroup],
  questions: [...catalog.questions, paymentReference],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('application integration', () => {
  it('confirms draft deletion inline, supports cancel/retry and keeps published/closed forms protected', async () => {
    storeToken('token');
    let forms = ['DRAFT', 'PUBLISHED', 'CLOSED'].map((status) => ({
      id: status.toLowerCase(),
      name: `${status} trip`,
      slug: status.toLowerCase(),
      status,
      updatedAt: new Date().toISOString(),
    }));
    let deleteAttempts = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        deleteAttempts++;
        if (deleteAttempts === 1)
          return Promise.resolve(
            json({ message: 'Deletion failed. Try again.' }, 503),
          );
        forms = forms.filter((form) => form.id !== 'draft');
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(json(forms));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/forms']}>
        <App />
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole('button', { name: 'Delete draft: DRAFT trip' }),
    );
    expect(
      screen.getByText('Delete this draft permanently?'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(deleteAttempts).toBe(0);
    expect(
      screen.queryByRole('button', { name: 'Delete draft: PUBLISHED trip' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete draft: CLOSED trip' }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Delete draft: DRAFT trip' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Delete permanently' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Deletion failed. Try again.',
    );
    expect(screen.getByText('DRAFT trip')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Delete permanently' }),
    );
    await waitFor(() =>
      expect(screen.queryByText('DRAFT trip')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('PUBLISHED trip')).toBeInTheDocument();
    expect(screen.getByText('CLOSED trip')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls
        .filter(([, init]) => init?.method === 'DELETE')
        .map(([url]) => String(url)),
    ).toEqual([
      expect.stringContaining('/admin/forms/draft'),
      expect.stringContaining('/admin/forms/draft'),
    ]);
  });

  it.each([
    {
      answerType: 'number' as const,
      min: '10',
      max: '20',
      overrideMin: '0',
      overrideMax: '5',
      below: '-1',
      above: '6',
      valid: '3',
      title: 'value',
    },
    {
      answerType: 'date' as const,
      min: '2026-01-01',
      max: '2026-12-31',
      overrideMin: '2026-02-01',
      overrideMax: '2026-02-28',
      below: '2026-01-31',
      above: '2026-03-01',
      valid: '2026-02-15',
      title: 'date',
    },
  ])(
    'overrides, previews, clears and reloads $answerType limits without changing defaults',
    async (settings) => {
      storeToken('token');
      const question = {
        ...catalog.questions[0],
        question: 'Bounded answer',
        answerType: settings.answerType,
        min: settings.min,
        max: settings.max,
      };
      let saved: any;
      const fetchMock = vi.fn(
        (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          if (url.endsWith('form-catalog'))
            return Promise.resolve(json({ ...catalog, questions: [question] }));
          if (init?.method === 'POST' || init?.method === 'PATCH') {
            const body = JSON.parse(String(init.body));
            saved = {
              ...body,
              id: 'bounded',
              status: 'DRAFT',
              updatedAt: new Date().toISOString(),
              groups: catalog.groups,
              questions: body.questions.map((selection: object) => ({
                ...question,
                ...selection,
              })),
            };
            return Promise.resolve(json(saved));
          }
          return Promise.resolve(
            json(url.endsWith('/admin/forms/bounded') ? saved : [saved]),
          );
        },
      );
      vi.stubGlobal('fetch', fetchMock);
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/admin/forms/new']}>
          <App />
        </MemoryRouter>,
      );
      await user.type(
        await screen.findByLabelText(/Event name/),
        'Bounded form',
      );
      await user.selectOptions(screen.getByLabelText('Add a group'), 'student');
      await user.click(screen.getByLabelText('Include Bounded answer'));
      const minimum = () =>
        screen.getByLabelText(`Minimum ${settings.title}: Bounded answer`);
      const maximum = () =>
        screen.getByLabelText(`Maximum ${settings.title}: Bounded answer`);
      expect(minimum()).toHaveValue(
        settings.answerType === 'number' ? Number(settings.min) : settings.min,
      );
      expect(maximum()).toHaveValue(
        settings.answerType === 'number' ? Number(settings.max) : settings.max,
      );
      fireEvent.change(minimum(), { target: { value: settings.overrideMin } });
      fireEvent.change(maximum(), { target: { value: settings.overrideMax } });
      await user.click(
        screen.getByRole('button', { name: 'Collapse Student Details' }),
      );
      await user.click(
        screen.getByRole('button', { name: 'Expand Student Details' }),
      );
      expect(minimum()).toHaveValue(
        settings.answerType === 'number' ? 0 : settings.overrideMin,
      );
      await user.click(screen.getByRole('button', { name: 'Preview' }));
      const answer = screen.getByLabelText(/Bounded answer/);
      expect(answer).toHaveAttribute('min', settings.overrideMin);
      expect(answer).toHaveAttribute('max', settings.overrideMax);
      for (const value of [settings.below, settings.above]) {
        fireEvent.change(answer, { target: { value } });
        expect(answer).toBeInvalid();
      }
      fireEvent.change(answer, { target: { value: settings.valid } });
      expect(answer).toBeValid();
      await user.click(screen.getByRole('button', { name: 'Back to editing' }));
      fireEvent.change(maximum(), { target: { value: '' } });
      await user.click(screen.getByRole('button', { name: 'Save draft' }));
      await user.click(await screen.findByRole('link', { name: 'Edit' }));
      await screen.findByLabelText('Include Bounded answer');
      expect(saved.questions[0]).toMatchObject({
        min: settings.overrideMin,
        max: null,
      });
      expect(maximum()).toHaveValue(
        settings.answerType === 'number' ? null : '',
      );
      fireEvent.change(minimum(), { target: { value: '' } });
      await user.click(screen.getByRole('button', { name: 'Save draft' }));
      await screen.findByRole('link', { name: 'Edit' });
      expect(saved.questions[0]).toMatchObject({ min: null, max: null });
      expect(question).toMatchObject({ min: settings.min, max: settings.max });
    },
  );

  it('starts empty, adds accordion groups and preserves their chosen order through save and edit', async () => {
    storeToken('token');
    const library: FormCatalog = {
      groups: [
        ...catalog.groups,
        { id: 'trip', name: 'Trip', description: '' },
      ],
      questions: [
        ...catalog.questions,
        {
          ...catalog.questions[0],
          id: 'meal',
          groupId: 'trip',
          question: 'Meal',
          fieldType: 'dropdown',
          answerType: null,
          options: ['Veg', 'Regular'],
        },
      ],
    };
    let saved: any;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/admin/form-catalog'))
        return Promise.resolve(json(library));
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        saved = {
          ...body,
          id: 'ordered',
          status: 'DRAFT',
          updatedAt: new Date().toISOString(),
          groups: body.groupIds.map((id: string) =>
            library.groups.find((group) => group.id === id),
          ),
          questions: body.questions.map((question: { id: string }) => ({
            ...library.questions.find((item) => item.id === question.id),
            ...question,
          })),
        };
        return Promise.resolve(json(saved, 201));
      }
      return Promise.resolve(
        json(url.endsWith('/admin/forms/ordered') ? saved : [saved]),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/forms/new']}>
        <App />
      </MemoryRouter>,
    );
    await screen.findByText(
      'No groups added yet. Choose your first group below.',
    );
    expect(
      screen.queryByLabelText('Include Full Name'),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Event name/), 'Ordered trip');
    await user.selectOptions(screen.getByLabelText('Add a group'), 'student');
    await user.selectOptions(screen.getByLabelText('Add a group'), 'trip');
    expect(
      screen.getByRole('button', { name: 'Expand Student Details' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByLabelText('Include Full Name'),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Add a group')).queryByRole('option', {
        name: 'Trip',
      }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Include Meal'));
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Reorder option 2: Options: Meal' }),
      { key: 'ArrowUp' },
    );
    await user.click(
      screen.getByRole('button', { name: 'Expand Student Details' }),
    );
    await user.click(screen.getByLabelText('Include Full Name'));
    await user.click(
      screen.getByRole('button', { name: 'Collapse Student Details' }),
    );
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Reorder group: Trip' }),
      { key: 'ArrowUp' },
    );
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['Trip', 'Student Details']);
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['Form preview', 'Trip', 'Student Details']);
    expect(
      within(screen.getByRole('combobox', { name: /Meal/ }))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Select…', 'Regular', 'Veg']);
    await user.click(screen.getByRole('button', { name: 'Back to editing' }));
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await user.click(await screen.findByRole('link', { name: 'Edit' }));
    await screen.findByLabelText('Include Meal');
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['Trip', 'Student Details']);
    expect(screen.getByLabelText('Options: Meal: option 1')).toHaveValue(
      'Regular',
    );
    expect(saved.groupIds).toEqual(['trip', 'student']);
    await user.click(
      screen.getByRole('button', { name: 'Remove group: Trip' }),
    );
    expect(
      within(screen.getByLabelText('Add a group')).getByRole('option', {
        name: 'Trip',
      }),
    ).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Add a group'), 'trip');
    expect(screen.getByLabelText('Include Meal')).not.toBeChecked();
  });

  it('saves a newly added group in an unfinished draft before selecting questions', async () => {
    storeToken('token');
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        json(String(input).endsWith('form-catalog') ? catalog : []),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/forms/new']}>
        <App />
      </MemoryRouter>,
    );
    await user.type(await screen.findByLabelText(/Event name/), 'Unfinished');
    await user.selectOptions(screen.getByLabelText('Add a group'), 'student');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
      ).toBe(true),
    );
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      groupIds: ['student'],
      questions: [],
    });
  });

  it.each(['/admin/forms', '/admin/forms/saved/preview'])(
    'redirects protected route %s to login',
    (path) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole('heading', { name: 'Admin login' }),
      ).toBeInTheDocument();
    },
  );

  it('previews unsaved selections and options without saving or losing builder edits', async () => {
    storeToken('token');
    const library: FormCatalog = {
      groups: [
        ...catalog.groups,
        { id: 'trip', name: 'Trip', description: 'Trip instructions' },
      ],
      questions: [
        ...catalog.questions,
        {
          ...catalog.questions[0],
          id: 'meal',
          groupId: 'trip',
          question: 'Meal',
          fieldType: 'dropdown',
          answerType: null,
          options: ['Veg', 'Regular'],
        },
        {
          ...catalog.questions[0],
          id: 'age',
          question: 'Age',
          answerType: 'number',
          min: '5',
          max: '25',
        },
      ],
    };
    const fetchMock = vi.fn(() => Promise.resolve(json(library)));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/forms/new']}>
        <App />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'Preview' }));
    expect(screen.getByText('No questions selected yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to editing' }));
    await user.type(screen.getByLabelText(/Event name/), 'Unsaved preview');
    await user.selectOptions(screen.getByLabelText('Add a group'), 'trip');
    await user.click(screen.getByLabelText('Include Meal'));
    await user.click(screen.getByLabelText('Required: Meal'));
    await user.clear(screen.getByLabelText('Options: Meal: option 1'));
    await user.type(screen.getByLabelText('Options: Meal: option 1'), 'Vegan');
    await user.selectOptions(screen.getByLabelText('Add a group'), 'student');
    await user.click(screen.getByLabelText('Include Age'));
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(
      screen.getByRole('heading', { name: 'Unsaved preview' }),
    ).toBeInTheDocument();
    const questionHeadings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(questionHeadings).toEqual([
      'Form preview',
      'Trip',
      'Student Details',
    ]);
    expect(screen.queryByLabelText(/Full Name/)).not.toBeInTheDocument();
    const meal = screen.getByRole('combobox', { name: /Meal/ });
    expect(meal).not.toBeRequired();
    expect(
      within(meal)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Select…', 'Vegan', 'Regular']);
    await user.selectOptions(meal, 'Vegan');
    const age = screen.getByLabelText(/Age/);
    expect(age).toBeRequired();
    expect(age).toHaveAttribute('min', '5');
    expect(age).toHaveAttribute('max', '25');
    await user.type(age, '4');
    expect(age).toBeInvalid();
    const submit = screen.getByRole('button', { name: /Submit registration/ });
    expect(submit).toBeDisabled();
    fireEvent.submit(submit.closest('form'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Back to editing' }));
    expect(screen.getByLabelText(/Event name/)).toHaveValue('Unsaved preview');
    await user.click(screen.getByRole('button', { name: 'Expand Trip' }));
    expect(screen.getByLabelText('Options: Meal: option 1')).toHaveValue(
      'Vegan',
    );
    expect(screen.getByLabelText('Required: Meal')).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByLabelText(/Age/)).toHaveValue(null);
  });

  it.each(['DRAFT', 'PUBLISHED', 'CLOSED'])(
    'previews saved %s snapshots from the dashboard without enabling submissions',
    async (status) => {
      storeToken('token');
      const form = {
        id: 'saved',
        name: 'Saved trip',
        slug: 'saved-trip',
        status,
        groups: paymentCatalog.groups,
        questions: [
          {
            ...catalog.questions[0],
            question: 'Saved question',
            required: false,
          },
          { ...paymentReference, required: true },
        ],
        advancePayment: 100,
        totalPayment: 250,
        updatedAt: new Date().toISOString(),
      };
      const fetchMock = vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(
          json(
            String(input).endsWith('payment-settings')
              ? { upiId: 'test@upi', payeeName: 'Trekkenture', currency: 'INR' }
              : String(input).endsWith('/admin/forms/saved')
                ? form
                : [form],
          ),
        ),
      );
      vi.stubGlobal('fetch', fetchMock);
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/admin/forms']}>
          <App />
        </MemoryRouter>,
      );
      await user.click(await screen.findByRole('link', { name: 'Preview' }));
      await user.type(
        await screen.findByLabelText(/Saved question/),
        'Preview answer',
      );
      expect(await screen.findByAltText('Payment QR code')).toHaveAttribute(
        'src',
        expect.stringContaining('am%3D100'),
      );
      expect(screen.getByText('Total event cost: ₹250')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Submit registration/ }),
      ).toBeDisabled();
      expect(
        fetchMock.mock.calls.every(([input]) =>
          String(input).includes('/admin/'),
        ),
      ).toBe(true);
      await user.click(screen.getByRole('link', { name: 'Back to forms' }));
      expect(await screen.findByText(status)).toBeInTheDocument();
    },
  );

  it('previews incomplete payment amounts and returns to editing when starting a new form', async () => {
    storeToken('token');
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(
          json(
            String(input).endsWith('payment-settings')
              ? { upiId: '', payeeName: 'Trekkenture', currency: 'INR' }
              : String(input).endsWith('/admin/forms/old')
                ? {
                    id: 'old',
                    name: 'Old draft',
                    slug: 'old',
                    status: 'DRAFT',
                    groups: catalog.groups,
                    questions: [],
                    advancePayment: null,
                    totalPayment: null,
                  }
                : paymentCatalog,
          ),
        ),
      ),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/forms/old/edit']}>
        <App />
      </MemoryRouter>,
    );
    await user.selectOptions(
      await screen.findByLabelText('Add a group'),
      'payment',
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(
      await screen.findByText('Advance payment: not set'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Payment account has not been configured yet.'),
    ).toBeInTheDocument();
    expect(screen.queryByAltText('Payment QR code')).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'New form' }));
    expect(await screen.findByLabelText(/Event name/)).toHaveValue('');
    expect(screen.queryByText('Form preview')).not.toBeInTheDocument();
  });

  it('logs in and loads all forms by default', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        return Promise.resolve(
          url.endsWith('/auth/login')
            ? json({ access_token: 'token' }, 201)
            : json([]),
        );
      }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <App />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText('Password'), 'frontend-test-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(
      await screen.findByText('No forms have been created yet.'),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem('trekkenture-admin-token')).toBe('token');
  });

  it('locks the Payment minimum, allows extras and removes the whole group with its amounts', async () => {
    storeToken('token');
    const library: FormCatalog = {
      ...paymentCatalog,
      questions: [
        ...paymentCatalog.questions,
        { ...paymentReference, id: 'receipt', question: 'Receipt notes' },
      ],
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        json(
          String(input).endsWith('/admin/form-catalog')
            ? library
            : String(input).endsWith('/payment-settings')
              ? { upiId: 'test@upi', payeeName: 'Test', currency: 'INR' }
              : [],
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/forms/new']}>
        <App />
      </MemoryRouter>,
    );
    await user.type(
      await screen.findByLabelText(/Event name/),
      'Optional payment',
    );
    await user.selectOptions(screen.getByLabelText('Add a group'), 'student');
    await user.click(screen.getByLabelText('Include Full Name'));
    await user.selectOptions(screen.getByLabelText('Add a group'), 'payment');
    const reference = screen.getByLabelText('Include Transaction number');
    expect(reference).toBeChecked();
    expect(reference).toBeDisabled();
    expect(screen.getByLabelText('Required: Transaction number')).toBeChecked();
    expect(
      screen.getByLabelText('Required: Transaction number'),
    ).toBeDisabled();
    const paymentSection = screen
      .getByRole('heading', { name: 'Payment' })
      .closest('section');
    expect(paymentSection).toContainElement(
      screen.getByLabelText('Advance payment (INR)'),
    );
    expect(paymentSection).toContainElement(
      screen.getByLabelText('Total payment (INR)'),
    );
    await user.type(screen.getByLabelText('Advance payment (INR)'), '100');
    await user.type(screen.getByLabelText('Total payment (INR)'), '250');
    await user.click(screen.getByLabelText('Include Receipt notes'));
    await user.click(screen.getByLabelText('Required: Receipt notes'));
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByText('Pay ₹100 advance');
    const previewSection = screen
      .getByRole('heading', { name: 'Payment' })
      .closest('section');
    expect(previewSection).toContainElement(
      screen.getByLabelText(/Transaction number/),
    );
    expect(previewSection).toContainElement(
      screen.getByText('Total event cost: ₹250'),
    );
    expect(screen.getByLabelText(/Transaction number/)).toBeRequired();
    expect(screen.getByLabelText('Receipt notes')).not.toBeRequired();
    await user.click(screen.getByRole('button', { name: 'Back to editing' }));
    await user.click(screen.getByLabelText('Include Receipt notes'));
    expect(screen.getByLabelText('Include Transaction number')).toBeChecked();
    await user.click(
      screen.getByRole('button', { name: 'Remove group: Payment' }),
    );
    expect(
      screen.queryByLabelText('Advance payment (INR)'),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(
      screen.queryByRole('heading', { name: 'Payment' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Transaction number/),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to editing' }));
    await user.selectOptions(screen.getByLabelText('Add a group'), 'payment');
    expect(screen.getByLabelText('Advance payment (INR)')).toHaveValue(null);
    expect(screen.getByLabelText('Total payment (INR)')).toHaveValue(null);
    await user.click(
      screen.getByRole('button', { name: 'Remove group: Payment' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
      ).toBe(true),
    );
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      questions: [{ id: 'student.fullName', required: true }],
      advancePayment: null,
      totalPayment: null,
    });
  });

  it('preserves a manually typed hyphenated slug and shows the saved draft on the dashboard', async () => {
    storeToken('token');
    let savedDraft: unknown = null;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/admin/form-catalog'))
        return Promise.resolve(json(catalog));
      if (url.endsWith('/admin/forms') && init?.method === 'POST') {
        savedDraft = {
          ...JSON.parse(String(init.body)),
          id: 'form-1',
          status: 'DRAFT',
          updatedAt: new Date().toISOString(),
        };
        return Promise.resolve(json({ id: 'form-1', status: 'DRAFT' }, 201));
      }
      if (url.endsWith('/admin/forms'))
        return Promise.resolve(json(savedDraft ? [savedDraft] : []));
      return Promise.resolve(json([]));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/forms/new']}>
        <App />
      </MemoryRouter>,
    );

    await user.type(
      await screen.findByLabelText(/Event name/),
      'Forest Camp 2026',
    );
    const slug = screen.getByLabelText(/Public URL slug/);
    expect(slug).toHaveValue('forest-camp-2026');
    await user.clear(slug);
    await user.type(slug, 'forest-camp');
    expect(slug).toHaveValue('forest-camp');
    await user.selectOptions(screen.getByLabelText('Add a group'), 'student');
    await user.click(screen.getByLabelText(/Full Name/));
    await user.click(screen.getByRole('button', { name: /Save draft/ }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([, init]) => init?.method === 'POST',
      );
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
        name: 'Forest Camp 2026',
        slug: 'forest-camp',
        questions: [{ id: 'student.fullName', required: true }],
        advancePayment: null,
        totalPayment: null,
      });
    });
    expect(
      await screen.findByRole('button', { name: 'Publish' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Forest Camp 2026')).toBeInTheDocument();
  });

  it('renders a closed public form notice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          json({
            id: '1',
            name: 'Closed Trek',
            slug: 'closed-trek',
            status: 'CLOSED',
          }),
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={['/forms/closed-trek']}>
        <App />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText('Registrations are currently closed.'),
    ).toBeInTheDocument();
  });

  it('renders and submits a published dynamic form', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'POST'
          ? json({ submissionId: 'submission-1' }, 201)
          : json({
              id: '1',
              name: 'Forest Camp',
              slug: 'forest-camp',
              status: 'PUBLISHED',
              groups: catalog.groups,
              questions: catalog.questions.map((question) => ({
                ...question,
                required: true,
              })),
            }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/forms/forest-camp']}>
        <App />
      </MemoryRouter>,
    );
    await user.type(await screen.findByLabelText(/Full Name/), 'Test Student');
    await user.click(
      screen.getByRole('button', { name: /Submit registration/ }),
    );
    expect(
      await screen.findByText('Registration complete'),
    ).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      answers: { 'student.fullName': 'Test Student' },
    });
  });

  it('closes an active form and can log out', async () => {
    storeToken('token');
    let closed = false;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'POST') {
          closed = true;
          return Promise.resolve(json({ status: 'CLOSED' }, 201));
        }
        return Promise.resolve(
          json(
            closed
              ? []
              : [
                  {
                    id: '1',
                    name: 'Live Trek',
                    slug: 'live-trek',
                    status: 'PUBLISHED',
                    responseCount: 2,
                    updatedAt: new Date().toISOString(),
                  },
                ],
          ),
        );
      }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/forms']}>
        <App />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Active' }));
    await user.click(await screen.findByRole('button', { name: 'Close' }));
    expect(
      await screen.findByText('No published forms are active.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Logout/ }));
    expect(
      screen.getByRole('heading', { name: 'Admin login' }),
    ).toBeInTheDocument();
  });

  it('downloads an authenticated Excel export', async () => {
    vi.useFakeTimers();
    storeToken('token');
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(new Blob(['xlsx']), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:test'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function () {
        expect(this.isConnected).toBe(true);
        expect(this.download).toBe('forest-camp-responses.xlsx');
        expect(this.href).toBe('blob:test');
        expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      });

    await downloadExport('form-1', 'forest-camp');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/forms/form-1/submissions/export'),
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
    );
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('allows saving an empty draft', async () => {
    storeToken('token');
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        json(String(input).endsWith('/admin/form-catalog') ? catalog : []),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/forms/new']}>
        <App />
      </MemoryRouter>,
    );
    await user.type(
      await screen.findByLabelText(/Event name/),
      'Unfinished Trek',
    );
    await user.click(screen.getByRole('button', { name: /Save draft/ }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
      ).toBe(true),
    );
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body)).questions).toEqual([]);
  });

  it('retains a deleted library question snapshot and edits its form options and payment settings', async () => {
    storeToken('token');
    const savedQuestion = {
      ...catalog.questions[0],
      id: 'old-question',
      question: 'Section',
      fieldType: 'dropdown',
      answerType: null,
      options: ['A', 'B'],
      required: true,
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/admin/form-catalog'))
        return Promise.resolve(
          json({ groups: [paymentGroup], questions: [paymentReference] }),
        );
      if (String(input).endsWith('/admin/forms/old'))
        return Promise.resolve(
          json({
            id: 'old',
            name: 'Old draft',
            slug: 'old-draft',
            questions: [savedQuestion],
            groups: catalog.groups,
            advancePayment: null,
            totalPayment: null,
          }),
        );
      return Promise.resolve(json([]));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/forms/old/edit']}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByLabelText('Include Section')).toBeChecked();
    await user.click(screen.getByLabelText('Required: Section'));
    await user.click(
      screen.getByRole('button', { name: 'Delete option 1: Options: Section' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Add option: Options: Section' }),
    );
    await user.type(screen.getByLabelText('Options: Section: option 2'), 'C');
    fireEvent.keyDown(
      screen.getByRole('button', {
        name: 'Reorder option 2: Options: Section',
      }),
      { key: 'ArrowUp' },
    );
    await user.selectOptions(screen.getByLabelText('Add a group'), 'payment');
    await user.type(screen.getByLabelText('Advance payment (INR)'), '100');
    await user.type(screen.getByLabelText('Total payment (INR)'), '300');
    await user.click(screen.getByRole('button', { name: /Save draft/ }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH'),
      ).toBe(true),
    );
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'PATCH',
    );
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
      name: 'Old draft',
      slug: 'old-draft',
      groupIds: ['student', 'payment'],
      questions: [
        { id: 'old-question', required: false, options: ['C', 'B'] },
        { id: 'payment.utr', required: true },
      ],
      advancePayment: 100,
      totalPayment: 300,
    });
  });

  it('creates and edits library groups and questions, and explains blocked group deletion', async () => {
    storeToken('token');
    let library: FormCatalog = { groups: [], questions: [] };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      if (init?.method === 'PUT' && body?.question === '')
        return Promise.resolve(
          json({ message: 'Question cannot be empty' }, 400),
        );
      if (init?.method === 'DELETE') {
        if (url.endsWith('/admin/questions/question-1')) library.questions = [];
        else if (library.questions.length > 0)
          return Promise.resolve(
            json(
              { message: 'Delete or move the questions in this group first.' },
              409,
            ),
          );
        else library.groups = [];
      }
      if (url.endsWith('/admin/question-groups') && init?.method === 'POST')
        library.groups.push({ id: 'group-1', ...body });
      if (
        url.endsWith('/admin/question-groups/group-1') &&
        init?.method === 'PUT'
      )
        library.groups[0] = { id: 'group-1', ...body };
      if (url.endsWith('/admin/questions') && init?.method === 'POST')
        library.questions.push({ id: 'question-1', ...body });
      if (url.endsWith('/admin/questions/question-1') && init?.method === 'PUT')
        library.questions[0] = { id: 'question-1', ...body };
      return Promise.resolve(json(library));
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/questions']}>
        <App />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'New group' }));
    await user.type(screen.getByLabelText('Group name'), 'Trip');
    await user.type(
      screen.getByLabelText('Description / instructions'),
      'Choose your trip details.',
    );
    await user.click(screen.getByRole('button', { name: 'Save group' }));
    await user.click(
      await screen.findByRole('button', { name: 'Add question to Trip' }),
    );
    const groupSection = screen
      .getByRole('heading', { name: 'Trip' })
      .closest('section');
    expect(screen.getByLabelText('Group', { exact: true })).toBeDisabled();
    expect(screen.getByLabelText('Group', { exact: true })).toHaveValue(
      library.groups[0].id,
    );
    expect(groupSection).toContainElement(
      screen.getByLabelText('Question', { exact: true }),
    );
    await user.type(screen.getByLabelText('Question', { exact: true }), 'Meal');
    await user.selectOptions(screen.getByLabelText('Field type'), 'dropdown');
    await user.click(
      screen.getByRole('button', { name: 'Add option: Default options' }),
    );
    await user.type(screen.getByLabelText('Default options: option 1'), 'Veg');
    await user.click(
      screen.getByRole('button', { name: 'Add option: Default options' }),
    );
    await user.type(
      screen.getByLabelText('Default options: option 2'),
      'Regular',
    );
    await user.click(screen.getByRole('button', { name: 'Save question' }));
    await user.click(
      await screen.findByRole('button', { name: 'Edit question: Meal' }),
    );
    expect(screen.getByLabelText('Group', { exact: true })).toBeDisabled();
    expect(screen.getByLabelText('Group', { exact: true })).toHaveValue(
      library.groups[0].id,
    );
    expect(
      screen.getByLabelText('Question', { exact: true }).closest('li'),
    ).not.toBeNull();
    await user.clear(screen.getByLabelText('Question', { exact: true }));
    await user.type(screen.getByLabelText('Question', { exact: true }), '   ');
    await user.click(screen.getByRole('button', { name: 'Save question' }));
    const inlineError = await screen.findByRole('alert');
    expect(inlineError).toHaveTextContent('Question cannot be empty');
    expect(inlineError.closest('li')).not.toBeNull();
    await user.clear(screen.getByLabelText('Question', { exact: true }));
    await user.type(
      screen.getByLabelText('Question', { exact: true }),
      'Unsaved meal',
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Meal', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('Unsaved meal')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Edit question: Meal' }),
    );
    await user.selectOptions(screen.getByLabelText('Field type'), 'text');
    await user.selectOptions(screen.getByLabelText('Answer type'), 'number');
    await user.type(screen.getByLabelText('Minimum value'), '1');
    await user.type(screen.getByLabelText('Maximum value'), '5');
    await user.click(screen.getByRole('button', { name: 'Save question' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Save question' }),
      ).not.toBeInTheDocument(),
    );
    const questionUpdate = fetchMock.mock.calls
      .filter(
        ([url, init]) =>
          String(url).endsWith('/admin/questions/question-1') &&
          init?.method === 'PUT',
      )
      .at(-1);
    expect(JSON.parse(String(questionUpdate?.[1]?.body))).toMatchObject({
      question: 'Meal',
      fieldType: 'text',
      answerType: 'number',
      options: [],
      min: '1',
      max: '5',
    });
    await user.click(screen.getByRole('button', { name: 'Edit Trip' }));
    expect(groupSection).toContainElement(screen.getByLabelText('Group name'));
    await user.clear(screen.getByLabelText('Group name'));
    await user.type(screen.getByLabelText('Group name'), 'Trip Details');
    await user.click(screen.getByRole('button', { name: 'Save group' }));
    await user.click(
      await screen.findByRole('button', { name: 'Delete Trip Details' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Delete or move the questions',
    );
    expect(library.groups[0].name).toBe('Trip Details');
    await user.click(
      screen.getByRole('button', { name: 'Delete question: Meal' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Delete question: Meal' }),
      ).not.toBeInTheDocument(),
    );
    await user.click(
      screen.getByRole('button', { name: 'Delete Trip Details' }),
    );
    expect(
      await screen.findByText('Create a group, then add its questions.'),
    ).toBeInTheDocument();
  });

  it('submits all field types with amounts and the transaction number inside Payment', async () => {
    const question = (id: string, overrides: Partial<QuestionDefinition>) => ({
      ...catalog.questions[0],
      id,
      question: id,
      required: true,
      ...overrides,
    });
    const questions = [
      question('Meal', {
        fieldType: 'dropdown',
        answerType: null,
        options: ['Veg', 'Regular'],
      }),
      question('Pickup', {
        fieldType: 'radio',
        answerType: null,
        options: ['North', 'South'],
      }),
      question('Consent', { fieldType: 'checkbox', answerType: null }),
      question('Age', { answerType: 'number', min: '10', max: '80' }),
      question('Visit date', {
        answerType: 'date',
        min: '2026-10-01',
        max: '2026-10-31',
      }),
      { ...paymentReference, required: true },
    ];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        json(
          init?.method === 'POST'
            ? { submissionId: 'ok' }
            : {
                id: '1',
                name: 'Autumn Trek',
                slug: 'autumn',
                status: 'PUBLISHED',
                groups: paymentCatalog.groups,
                questions,
                payment: {
                  advancePayment: 100,
                  totalPayment: 300,
                  upiId: 'trek@upi',
                  payeeName: 'Trek',
                  currency: 'INR',
                },
              },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/forms/autumn']}>
        <App />
      </MemoryRouter>,
    );
    await user.selectOptions(await screen.findByLabelText(/Meal/), 'Veg');
    await user.click(screen.getByLabelText('North'));
    await user.click(screen.getByLabelText(/Consent/));
    await user.type(screen.getByLabelText(/Age/), '25');
    const dateInput = screen.getByLabelText(/Visit date/);
    expect(dateInput).toHaveAttribute('min', '2026-10-01');
    expect(dateInput).toHaveAttribute('max', '2026-10-31');
    fireEvent.change(dateInput, { target: { value: '2026-10-12' } });
    const paymentSection = screen
      .getByRole('heading', { name: 'Payment' })
      .closest('section');
    expect(paymentSection).toContainElement(
      screen.getByAltText('Payment QR code'),
    );
    expect(paymentSection).toContainElement(
      screen.getByLabelText(/Transaction number/),
    );
    expect(paymentSection).toContainElement(
      screen.getByText('Pay ₹100 advance'),
    );
    expect(
      screen.queryByRole('heading', { name: 'Payment instructions' }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Transaction number/), 'TEST-123');
    await user.click(
      screen.getByRole('button', { name: /Submit registration/ }),
    );
    expect(
      await screen.findByText('Registration complete'),
    ).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      answers: {
        Meal: 'Veg',
        Pickup: 'North',
        Consent: true,
        Age: 25,
        'Visit date': '2026-10-12',
        'payment.utr': 'TEST-123',
      },
    });
  });

  it('requires one boolean terms checkbox and ignores any stale options', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          json({
            id: '1',
            name: 'Trek',
            slug: 'trek',
            status: 'PUBLISHED',
            groups: catalog.groups,
            questions: [
              {
                ...catalog.questions[0],
                question: 'I accept the terms',
                fieldType: 'checkbox',
                options: ['Hiking', 'Swimming'],
                required: true,
              },
            ],
          }),
        ),
      ),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/forms/trek']}>
        <App />
      </MemoryRouter>,
    );
    const checkbox = await screen.findByRole('checkbox', {
      name: /I accept the terms/,
    });
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.queryByLabelText('Hiking')).not.toBeInTheDocument();
    expect(checkbox).toBeInvalid();
    await user.click(checkbox);
    expect(checkbox).toBeValid();
    await user.click(checkbox);
    expect(checkbox).toBeInvalid();
  });

  it('renders boolean answers as Yes and No in the responses table', async () => {
    storeToken('token');
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(
          json(
            String(input).endsWith('/submissions')
              ? [
                  {
                    id: 'answer-1',
                    answers: { 'student.fullName': false },
                    submittedAt: new Date().toISOString(),
                  },
                ]
              : {
                  id: 'form-1',
                  name: 'Camp',
                  questions: catalog.questions,
                  groups: catalog.groups,
                },
          ),
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={['/admin/forms/form-1/responses']}>
        <App />
      </MemoryRouter>,
    );
    const table = await screen.findByRole('table');
    expect(within(table).getByText('No')).toBeInTheDocument();
  });

  it('lets public users clear an optional radio answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          json({
            id: '1',
            name: 'Trek',
            slug: 'trek',
            status: 'PUBLISHED',
            groups: catalog.groups,
            questions: [
              {
                ...catalog.questions[0],
                question: 'Pickup',
                fieldType: 'radio',
                options: ['North', 'South'],
                required: false,
              },
            ],
          }),
        ),
      ),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/forms/trek']}>
        <App />
      </MemoryRouter>,
    );
    const north = await screen.findByLabelText('North');
    await user.click(north);
    expect(north).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(north).not.toBeChecked();
    expect(screen.getByLabelText('South')).not.toBeChecked();
  });

  it('adds, edits, deletes and reorders options and rejects blank or duplicate rows', async () => {
    function Editor() {
      const [options, setOptions] = useState(['A', 'B']);
      return (
        <OptionsEditor
          label="Choices"
          options={options}
          onChange={setOptions}
        />
      );
    }
    const user = userEvent.setup();
    render(<Editor />);
    expect(
      screen.queryByRole('button', { name: /Move option/ }),
    ).not.toBeInTheDocument();
    const firstHandle = screen.getByRole('button', {
      name: 'Reorder option 1: Choices',
    });
    await user.click(firstHandle);
    fireEvent.keyDown(firstHandle, { key: 'ArrowDown' });
    expect(screen.getByLabelText('Choices: option 1')).toHaveValue('B');
    expect(screen.getByLabelText('Choices: option 2')).toHaveValue('A');
    // The same row and handle survive moving, keeping keyboard focus.
    expect(firstHandle).toHaveFocus();
    expect(firstHandle).toHaveAccessibleName('Reorder option 2: Choices');
    fireEvent.keyDown(firstHandle, { key: 'ArrowUp' });
    expect(screen.getByLabelText('Choices: option 1')).toHaveValue('A');
    expect(firstHandle).toHaveFocus();
    fireEvent.keyDown(firstHandle, { key: 'ArrowUp' });
    expect(screen.getByLabelText('Choices: option 1')).toHaveValue('A');
    await user.click(
      screen.getByRole('button', { name: 'Add option: Choices' }),
    );
    const third = screen.getByLabelText('Choices: option 3');
    expect(third).toBeInvalid();
    await user.type(third, ' A ');
    expect(third).toBeInvalid();
    expect(screen.getByLabelText('Choices: option 1')).toBeInvalid();
    await user.clear(third);
    await user.type(third, '   ');
    expect(third).toBeInvalid();
    await user.clear(third);
    await user.type(third, 'C');
    expect(third).toBeValid();
    expect(screen.getByLabelText('Choices: option 1')).toBeValid();
    await user.click(
      screen.getByRole('button', { name: 'Delete option 2: Choices' }),
    );
    expect(screen.getByLabelText('Choices: option 2')).toHaveValue('C');
    expect(
      screen.queryByLabelText('Choices: option 3'),
    ).not.toBeInTheDocument();
  });

  it('clears irrelevant question settings when switching every field and answer type', async () => {
    storeToken('token');
    let question: QuestionDefinition = {
      ...catalog.questions[0],
      fieldType: 'dropdown',
      answerType: null,
      options: ['A', 'B'],
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PUT')
        question = { id: question.id, ...JSON.parse(String(init.body)) };
      return Promise.resolve(
        json({ groups: catalog.groups, questions: [question] }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/questions']}>
        <App />
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole('button', { name: 'Edit question: Full Name' }),
    );
    await user.selectOptions(screen.getByLabelText('Field type'), 'radio');
    expect(screen.getByLabelText('Default options: option 1')).toHaveValue('A');
    await user.selectOptions(screen.getByLabelText('Field type'), 'checkbox');
    expect(
      screen.queryByRole('button', { name: 'Add option: Default options' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Answer type')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save question' }));
    await waitFor(() => expect(question.fieldType).toBe('checkbox'));
    expect(question).toMatchObject({
      answerType: null,
      options: [],
      min: null,
      max: null,
    });
    await user.click(
      await screen.findByRole('button', { name: 'Edit question: Full Name' }),
    );
    await user.selectOptions(screen.getByLabelText('Field type'), 'dropdown');
    expect(
      screen.queryByLabelText('Default options: option 1'),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Add option: Default options' }),
    );
    await user.type(
      screen.getByLabelText('Default options: option 1'),
      'New option',
    );
    await user.selectOptions(screen.getByLabelText('Field type'), 'text');
    expect(
      screen.queryByRole('button', { name: 'Add option: Default options' }),
    ).not.toBeInTheDocument();
    for (const answerType of ['number', 'date', 'string', 'email', 'phone']) {
      await user.selectOptions(
        screen.getByLabelText('Answer type'),
        answerType,
      );
      if (answerType === 'number') {
        expect(screen.getByLabelText('Minimum value')).toHaveValue(null);
        await user.type(screen.getByLabelText('Minimum value'), '1');
        await user.type(screen.getByLabelText('Maximum value'), '5');
      } else if (answerType === 'date') {
        expect(screen.getByLabelText('Minimum date')).toHaveValue('');
        expect(screen.getByLabelText('Maximum date')).toHaveValue('');
        fireEvent.change(screen.getByLabelText('Minimum date'), {
          target: { value: '2026-10-01' },
        });
        fireEvent.change(screen.getByLabelText('Maximum date'), {
          target: { value: '2026-10-31' },
        });
      } else {
        expect(screen.queryByLabelText(/Minimum/)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Maximum/)).not.toBeInTheDocument();
      }
      await user.click(screen.getByRole('button', { name: 'Save question' }));
      await waitFor(() => expect(question.answerType).toBe(answerType));
      expect(question.options).toEqual([]);
      if (!['number', 'date'].includes(answerType))
        expect(question).toMatchObject({ min: null, max: null });
      await user.click(
        await screen.findByRole('button', { name: 'Edit question: Full Name' }),
      );
    }
  });

  it('submits checked terms as true and an untouched optional checkbox as false', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        json(
          init?.method === 'POST'
            ? { submissionId: 'ok' }
            : {
                id: '1',
                name: 'Trek',
                slug: 'trek',
                status: 'PUBLISHED',
                groups: catalog.groups,
                questions: [
                  {
                    ...catalog.questions[0],
                    id: 'terms',
                    question: 'Accept terms',
                    fieldType: 'checkbox',
                    answerType: null,
                    required: true,
                  },
                  {
                    ...catalog.questions[0],
                    id: 'updates',
                    question: 'Send updates',
                    fieldType: 'checkbox',
                    answerType: null,
                    required: false,
                  },
                ],
              },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/forms/trek']}>
        <App />
      </MemoryRouter>,
    );
    const terms = await screen.findByRole('checkbox', { name: /Accept terms/ });
    await user.click(
      screen.getByRole('button', { name: /Submit registration/ }),
    );
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(false);
    await user.click(terms);
    await user.click(
      screen.getByRole('button', { name: /Submit registration/ }),
    );
    expect(
      await screen.findByText('Registration complete'),
    ).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      answers: { terms: true, updates: false },
    });
  });
});
