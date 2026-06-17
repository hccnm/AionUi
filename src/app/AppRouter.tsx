import React from 'react';
import Layout from '@renderer/components/layout/Layout';
import Router from '@renderer/components/layout/Router';
import Sider from '@renderer/components/layout/Sider';

export const AppRouter = () => <Router layout={<Layout sider={<Sider />} />} />;
