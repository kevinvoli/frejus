import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { SpecialtiesPage } from './pages/SpecialtiesPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { PortfolioCategoriesPage } from './pages/PortfolioCategoriesPage';
import { TestimonialsPage } from './pages/TestimonialsPage';
import { ContactMessagesPage } from './pages/ContactMessagesPage';
import { GalleriesPage } from './pages/GalleriesPage';
import { GalleryDetailPage } from './pages/GalleryDetailPage';
import { SpecialtyDetailPage } from './pages/SpecialtyDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/settings" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/specialties" element={<SpecialtiesPage />} />
            <Route path="/specialties/:id" element={<SpecialtyDetailPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/portfolio-categories" element={<PortfolioCategoriesPage />} />
            <Route path="/testimonials" element={<TestimonialsPage />} />
            <Route path="/galleries" element={<GalleriesPage />} />
            <Route path="/galleries/:id" element={<GalleryDetailPage />} />
            <Route path="/contact-messages" element={<ContactMessagesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
