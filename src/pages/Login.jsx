import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authAPI } from '../api';
import { setToken, setUser } from '../utils/auth';

const { Title } = Typography;

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const res = await authAPI.login(values);
      
      if (res.success) {
        // 保存 token 和用户信息
        setToken(res.data.token);
        setUser(res.data.user);
        
        message.success('登录成功');
        navigate('/dashboard');
      } else {
        message.error(res.message || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      let errorMsg = '登录失败，请检查用户名和密码';
      
      if (error.response) {
        errorMsg = error.response.data?.message || `错误 ${error.response.status}`;
      } else if (error.request) {
        errorMsg = '无法连接到服务器，请检查后端服务是否启动';
      } else {
        errorMsg = error.message || '登录失败';
      }
      
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
          <Title level={2} style={{ margin: 0 }}>拼豆 DIY 管理</Title>
          <p style={{ color: '#666' }}>后台管理系统</p>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{ marginTop: 8 }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 16 }}>
          <p>提示：需要使用管理员账号登录</p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
