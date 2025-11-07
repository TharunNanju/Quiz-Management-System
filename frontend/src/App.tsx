import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { SplashScreen } from './components/SplashScreen';
import { LoginPage } from './modules/auth/LoginPage';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { RegisterPage } from './modules/auth/RegisterPage';
import { AttemptPage } from './modules/attempts/AttemptPage';
import { Layout } from './modules/layout/Layout';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { QuizDetailPage } from './modules/quizzes/QuizDetailPage';

const App = () => {
  return (
    <Suspense fallback={<SplashScreen message="Loading interface…" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="quizzes/:quizId" element={<QuizDetailPage />} />
            <Route path="attempts/:attemptId" element={<AttemptPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
