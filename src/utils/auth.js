// 认证工具函数

export const getToken = () => {
  return localStorage.getItem('admin_token');
};

export const setToken = (token) => {
  localStorage.setItem('admin_token', token);
};

export const removeToken = () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
};

export const getUser = () => {
  const user = localStorage.getItem('admin_user');
  return user ? JSON.parse(user) : null;
};

export const setUser = (user) => {
  localStorage.setItem('admin_user', JSON.stringify(user));
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const logout = () => {
  removeToken();
  window.location.href = '/login';
};
