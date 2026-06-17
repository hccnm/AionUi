import React from 'react';
import Layout from '@renderer/components/layout/Layout';
import AppLoader from '@renderer/components/layout/AppLoader';
import { useAuth } from '@renderer/hooks/context/AuthContext';
import LoginPage from '@renderer/pages/login';
import ConversationPage from '@renderer/pages/conversation';
import GuidPage from '@renderer/pages/guid';
import { Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { WebSider } from '@web/app/WebSider';

const withRouteFallback = (node: React.ReactElement) => <Suspense fallback={<AppLoader />}>{node}</Suspense>;

const ProtectedLayout: React.FC = () => {
  const { status } = useAuth();

  if (status === 'checking') {
    return <AppLoader />;
  }

  if (status !== 'authenticated') {
    return <Navigate to='/login' replace />;
  }

  return <Layout sider={<WebSider />} />;
};

export const AppRouter = () => {
  const { status } = useAuth();

  return (
    <HashRouter>
      <Routes>
        <Route
          path='/login'
          element={status === 'authenticated' ? <Navigate to='/guid' replace /> : withRouteFallback(<LoginPage />)}
        />
        <Route element={<ProtectedLayout />}>
          <Route index element={<Navigate to='/guid' replace />} />
          <Route path='/guid' element={withRouteFallback(<GuidPage />)} />
          <Route path='/conversation/:id' element={withRouteFallback(<ConversationPage />)} />
        </Route>
        <Route path='*' element={<Navigate to={status === 'authenticated' ? '/guid' : '/login'} replace />} />
      </Routes>
    </HashRouter>
  );
};
