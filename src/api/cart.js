// 购物车 API
const API_BASE = 'http://localhost:3000/api';

// 获取 token
const getToken = () => {
  return localStorage.getItem('admin_token');
};

// 获取购物车列表
export const getCartList = async () => {
  try {
    const res = await fetch(`${API_BASE}/cart`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('获取购物车失败:', error);
    return { success: false, message: error.message };
  }
};

// 删除购物车项目
export const deleteCartItem = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/cart/items/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('删除购物车失败:', error);
    return { success: false, message: error.message };
  }
};

// 清空购物车
export const clearCart = async () => {
  try {
    const res = await fetch(`${API_BASE}/cart`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('清空购物车失败:', error);
    return { success: false, message: error.message };
  }
};
