import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './auth';
import { AdminShell } from './components/AdminShell';
import { FormBuilderPage } from './pages/FormBuilderPage';
import { FormPreviewPage } from './pages/FormPreviewPage';
import { FormsDashboardPage } from './pages/FormsDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PublicFormPage } from './pages/PublicFormPage';
import { ResponsesPage } from './pages/ResponsesPage';
import { QuestionLibraryPage } from './pages/QuestionLibraryPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/forms" replace />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/forms/:eventSlug"
          element={
            <main>
              <PublicFormPage />
            </main>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="forms" replace />} />
          <Route path="forms" element={<FormsDashboardPage />} />
          <Route path="questions" element={<QuestionLibraryPage />} />
          <Route path="forms/new" element={<FormBuilderPage />} />
          <Route path="forms/:id/edit" element={<FormBuilderPage />} />
          <Route path="forms/:id/preview" element={<FormPreviewPage />} />
          <Route path="forms/:id/responses" element={<ResponsesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin/forms" replace />} />
      </Routes>
    </AuthProvider>
  );
}
