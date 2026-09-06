import { useCallback, useEffect, useState } from "react";
import { Clipboard, Download, Eye, Pencil, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest, downloadExport } from "../api";
import { EventStatus, FormSummary } from "../types";

const badge: Record<EventStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-amber-100 text-amber-800",
};

export function FormsDashboardPage() {
  const [activeOnly, setActiveOnly] = useState(false);
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [deleteId, setDeleteId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = activeOnly ? "?status=PUBLISHED" : "";
      setForms(await apiRequest<FormSummary[]>(`/admin/forms${query}`));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load forms",
      );
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const action = async (
    form: FormSummary,
    name: "publish" | "close" | "reopen" | "delete",
  ) => {
    setBusyId(form.id);
    setError("");
    try {
      await apiRequest(
        `/admin/forms/${form.id}${name === "delete" ? "" : `/${name}`}`,
        {
          method: name === "delete" ? "DELETE" : "POST",
        },
      );
      setDeleteId("");
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : `Could not ${name} form`,
      );
    } finally {
      setBusyId("");
    }
  };

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/forms/${slug}`,
      );
    } catch {
      setError("Could not copy the public link");
    }
  };

  const exportResponses = async (form: FormSummary) => {
    setError("");
    try {
      await downloadExport(form.id, form.slug);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not export responses",
      );
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Registration forms
          </h1>
          <p className="mt-1 text-slate-500">
            Publish forms and review every response.
          </p>
        </div>
        <Link
          to="/admin/forms/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Build form
        </Link>
      </div>

      <div className="mb-5 flex gap-2 border-b border-slate-200">
        {[
          { label: "Active", value: true },
          { label: "All forms", value: false },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveOnly(tab.value)}
            className={`border-b-2 px-4 py-2 text-sm font-semibold ${activeOnly === tab.value ? "border-primary text-primary" : "border-transparent text-slate-500"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p className="py-12 text-center text-slate-500">Loading forms…</p>
      ) : forms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
          {activeOnly
            ? "No published forms are active."
            : "No forms have been created yet."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Form</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Responses</th>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forms.map((form) => (
                <tr key={form.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{form.name}</p>
                    <p className="text-xs text-slate-400">/forms/{form.slug}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge[form.status]}`}
                    >
                      {form.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">{form.responseCount ?? 0}</td>
                  <td className="px-5 py-4 text-slate-500">
                    {new Date(form.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        to={`/admin/forms/${form.id}/preview`}
                        className="rounded border px-3 py-2 font-semibold text-slate-600"
                      >
                        Preview
                      </Link>
                      {form.status === "DRAFT" && (
                        <>
                          <Link
                            title="Edit"
                            to={`/admin/forms/${form.id}/edit`}
                            className="rounded border p-2 text-slate-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            disabled={busyId === form.id}
                            onClick={() => action(form, "publish")}
                            className="rounded bg-primary px-3 py-2 font-semibold text-white"
                          >
                            Publish
                          </button>
                          {deleteId === form.id ? (
                            <div className="flex flex-wrap items-center gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2">
                              <span className="text-rose-800">
                                Delete this draft permanently?
                              </span>
                              <button
                                disabled={busyId === form.id}
                                onClick={() => action(form, "delete")}
                                className="rounded bg-rose-600 px-3 py-1 font-semibold text-white"
                              >
                                Delete permanently
                              </button>
                              <button
                                disabled={busyId === form.id}
                                onClick={() => setDeleteId("")}
                                className="rounded border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              disabled={busyId === form.id}
                              aria-label={`Delete draft: ${form.name}`}
                              onClick={() => setDeleteId(form.id)}
                              className="rounded border border-rose-200 px-3 py-2 font-semibold text-rose-600"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                      {form.status !== "DRAFT" && (
                        <>
                          <button
                            title="Copy public link"
                            onClick={() => void copyLink(form.slug)}
                            className="rounded border p-2 text-slate-600"
                          >
                            <Clipboard className="h-4 w-4" />
                          </button>
                          <Link
                            title="Responses"
                            to={`/admin/forms/${form.id}/responses`}
                            className="rounded border p-2 text-slate-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            title="Export"
                            onClick={() => void exportResponses(form)}
                            className="rounded border p-2 text-slate-600"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {form.status === "PUBLISHED" && (
                        <button
                          disabled={busyId === form.id}
                          onClick={() => action(form, "close")}
                          className="rounded bg-amber-100 px-3 py-2 font-semibold text-amber-800"
                        >
                          Close
                        </button>
                      )}
                      {form.status === "CLOSED" && (
                        <button
                          disabled={busyId === form.id}
                          onClick={() => action(form, "reopen")}
                          className="rounded bg-emerald-100 px-3 py-2 font-semibold text-emerald-800"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
