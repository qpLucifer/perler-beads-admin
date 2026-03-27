import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import { isAuthenticated } from './utils/auth';
import MainLayout from './layouts/MainLayout';
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Products = lazy(() => import('./pages/Products'));
const Orders = lazy(() => import('./pages/Orders'));
const Artworks = lazy(() => import('./pages/Artworks'));
const Templates = lazy(() => import('./pages/Templates'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Reviews = lazy(() => import('./pages/Reviews'));
const LegalDocs = lazy(() => import('./pages/LegalDocs'));
const AiTemplateJobs = lazy(() => import('./pages/AiTemplateJobs'));
const Coupons = lazy(() => import('./pages/Coupons'));

// 受保护的路由组件
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Suspense
          fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spin size="large" />
            </div>
          }
        >
          <Routes>
            {/* 登录页 */}
            <Route path="/login" element={<Login />} />

            {/* 受保护的路由 */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="products" element={<Products />} />
              <Route path="orders" element={<Orders />} />
              <Route path="artworks" element={<Artworks />} />
              <Route path="templates" element={<Templates />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="legal" element={<LegalDocs />} />
              <Route path="ai-jobs" element={<AiTemplateJobs />} />
              <Route path="coupons" element={<Coupons />} />
            </Route>

            {/* 404 重定向 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
