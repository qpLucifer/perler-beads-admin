import axios from 'axios';
import { message } from 'antd';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 增加到 30 秒
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const serverMsg = error.response?.data?.message;
    const fallbackMsg = error.message || '请求失败';
    const userMsg = serverMsg || fallbackMsg;

    if (error.response) {
      // 401 未授权，清除 token 并跳转登录
      if (status === 401) {
        message.warning('登录已过期，请重新登录');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
      // 403 权限不足
      if (status === 403) {
        message.error('权限不足');
      }
      if (status >= 500) {
        message.error(userMsg);
      }
    } else {
      message.error(userMsg);
    }
    return Promise.reject(error);
  }
);

// 认证 API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
};

// 仪表盘 API
export const dashboardAPI = {
  getStats: () => api.get('/admin/dashboard/stats'),
  getRecentOrders: () => api.get('/admin/dashboard/recent-orders'),
};

// 用户管理 API
export const usersAPI = {
  getList: (params) => api.get('/admin/users', { params }),
  getById: (id) => api.get(`/admin/users/${id}`),
  update: (id, data) => api.put(`/admin/users/${id}`, data),
  resetPassword: (id, data) => api.post(`/admin/users/${id}/reset-password`, data),
  delete: (id) => api.delete(`/admin/users/${id}`),
};

// 商品管理 API
export const productsAPI = {
  getList: (params) => api.get('/admin/products', { params }),
  create: (data) => api.post('/admin/products', data),
  update: (id, data) => api.put(`/admin/products/${id}`, data),
  delete: (id) => api.delete(`/admin/products/${id}`),
};

// 订单管理 API
export const ordersAPI = {
  getList: (params) => api.get('/admin/orders', { params }),
  getById: (id) => api.get(`/admin/orders/${id}`),
  updateStatus: (id, data) => api.put(`/admin/orders/${id}/status`, data),
};

// 作品管理 API
export const artworksAPI = {
  getList: (params) => api.get('/admin/artworks', { params }),
  delete: (id) => api.delete(`/admin/artworks/${id}`),
};

// 模板管理 API
export const templatesAPI = {
  getList: (params) => api.get('/admin/templates', { params }),
  getById: (id) => api.get(`/admin/templates/${id}`),
  create: (data) => api.post('/admin/templates', data),
  update: (id, data) => api.put(`/admin/templates/${id}`, data),
  batchDelete: (ids) => api.post('/admin/templates/batch-delete', { ids }),
  batchUpdateType: (ids, is_official) => api.post('/admin/templates/batch-type', { ids, is_official }),
  delete: (id) => api.delete(`/admin/templates/${id}`),
};

// 收藏 API
export const favoritesAPI = {
  getList: (params) => api.get('/favorites', { params }),
  add: (productId) => api.post('/favorites', { product_id: productId }),
  remove: (productId) => api.delete(`/favorites/${productId}`),
  toggle: (productId) => api.post(`/favorites/toggle/${productId}`),
};

// 购物车 API
export const cartAPI = {
  get: () => api.get('/cart'),
  addItem: (productId, quantity) => api.post('/cart/items', { product_id: productId, quantity }),
  updateItem: (id, quantity) => api.put(`/cart/items/${id}`, { quantity }),
  removeItem: (id) => api.delete(`/cart/items/${id}`),
  clear: () => api.delete('/cart'),
};

// 优惠券 API
export const couponsAPI = {
  getList: () => api.get('/coupons'),
  getMyCoupons: () => api.get('/coupons/user/my'),
  claim: (couponId) => api.post(`/coupons/claim/${couponId}`),
};

// 评价管理 API
export const reviewsAPI = {
  getList: (params) => api.get('/admin/reviews', { params }),
  delete: (id) => api.delete(`/admin/reviews/${id}`),
};

// 协议管理 API
export const legalAPI = {
  getDoc: (docKey) => api.get(`/admin/legal/${docKey}`),
  updateDoc: (docKey, data) => api.put(`/admin/legal/${docKey}`, data),
  getVersions: (docKey) => api.get(`/admin/legal/${docKey}/versions`),
  rollback: (docKey, versionId) => api.post(`/admin/legal/${docKey}/rollback/${versionId}`),
};

// AI 任务记录 API
export const aiJobsAPI = {
  getList: (params) => api.get('/admin/ai-template-jobs', { params }),
  getByTaskId: (taskId) => api.get(`/admin/ai-template-jobs/${taskId}`),
};

// 优惠券管理 API
export const adminCouponsAPI = {
  getList: (params) => api.get('/admin/coupons', { params }),
  create: (data) => api.post('/admin/coupons', data),
  update: (id, data) => api.put(`/admin/coupons/${id}`, data),
  delete: (id) => api.delete(`/admin/coupons/${id}`),
  grantToUser: (id, user_id) => api.post(`/admin/coupons/${id}/grant`, { user_id }),
  grantBatch: (id, user_ids) => api.post(`/admin/coupons/${id}/grant-batch`, { user_ids }),
  grantByFilter: (id, data) => api.post(`/admin/coupons/${id}/grant-by-filter`, data),
  previewGrantByFilter: (id, data) => api.post(`/admin/coupons/${id}/grant-by-filter/preview`, data),
  getGrants: (id, params) => api.get(`/admin/coupons/${id}/grants`, { params }),
};

export default api;
