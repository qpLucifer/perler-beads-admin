import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Tag,
  Typography,
  Alert,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { usersAPI } from '../api';
import { useListState } from '../hooks/useListState';
import { applyAndNotifyAppliedFilters } from '../utils/appliedFilters';
import { scrollAndFlashFocusField } from '../utils/focusField';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const Users = () => {
  const [searchParams] = useSearchParams();
  const focusField = searchParams.get('focus_field') || '';
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const { pagination, setPagination, filters, setFilters, setFilter, resetListState } = useListState({
    storageKey: 'admin:list:users',
    defaults: { keyword: '', status: '', sort_by: 'created_at', sort_order: 'desc' }
  });
  const [keywordInput, setKeywordInput] = useState(filters.keyword);
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const appliedFilterNoticeRef = useRef('');
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, [pagination.current, pagination.pageSize, filters.keyword, filters.status, filters.sort_by, filters.sort_order]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusField) return;
    return scrollAndFlashFocusField(focusField);
  }, [focusField]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        keyword: filters.keyword || undefined,
        status: filters.status || undefined,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
      };
      const res = await usersAPI.getList(params);
      const requestedFilters = {
        keyword: filters.keyword,
        status: filters.status,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order
      };
      applyAndNotifyAppliedFilters({
        label: '用户列表',
        requested: requestedFilters,
        applied: res.data?.applied_filters,
        lastSignatureRef: appliedFilterNoticeRef,
        setFilters,
        setKeywordInput
      });
      setUsers(res.data.users);
      setPagination({
        current: res.data.pagination.page,
        pageSize: res.data.pagination.limit,
        total: res.data.pagination.total,
      });
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilter('keyword', keywordInput.trim());
  };

  const handleResetFilters = () => {
    setKeywordInput('');
    resetListState();
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setModalVisible(true);
  };

  const handlePasswordReset = (user) => {
    setEditingUser(user);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  const handleDelete = async (userId) => {
    try {
      await usersAPI.delete(userId);
      message.success('删除成功');
      fetchUsers();
    } catch (error) {
      console.error('删除用户失败:', error);
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await usersAPI.update(editingUser.id, values);
      message.success('更新成功');
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      console.error('更新用户失败:', error);
      message.error('更新失败');
    }
  };

  const handlePasswordSubmit = async () => {
    try {
      const values = await passwordForm.validateFields();
      await usersAPI.resetPassword(editingUser.id, values);
      message.success('密码重置成功');
      setPasswordModalVisible(false);
    } catch (error) {
      console.error('重置密码失败:', error);
      message.error('重置密码失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '正常' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => dayjs(time).format('YYYY-MM-DD'),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<KeyOutlined />}
            onClick={() => handlePasswordReset(record)}
          >
            重置密码
          </Button>
          {record.role !== 'admin' && (
            <Popconfirm
              title="确定删除该用户吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>👥 用户管理</Title>

      <Card style={{ marginBottom: 16 }}>
        {focusField && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`当前关注字段：${focusField}`}
          />
        )}
        <Space>
          <Input
            placeholder="搜索用户名/邮箱/昵称"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
            data-focus-field="keyword"
          />
          <Select
            placeholder="状态筛选"
            value={filters.status}
            onChange={(v) => setFilter('status', v || '')}
            style={{ width: 120 }}
            allowClear
            status={focusField === 'status' ? 'warning' : undefined}
            data-focus-field="status"
          >
            <Option value="1">正常</Option>
            <Option value="0">禁用</Option>
          </Select>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Select
            value={filters.sort_by}
            onChange={(v) => setFilter('sort_by', v)}
            style={{ width: 140 }}
            status={focusField === 'sort_by' ? 'warning' : undefined}
            data-focus-field="sort_by"
          >
            <Option value="created_at">按注册时间</Option>
            <Option value="last_login_at">按最后登录</Option>
            <Option value="id">按ID</Option>
          </Select>
          <Select
            value={filters.sort_order}
            onChange={(v) => setFilter('sort_order', v)}
            style={{ width: 110 }}
            status={focusField === 'sort_order' ? 'warning' : undefined}
            data-focus-field="sort_order"
          >
            <Option value="desc">降序</Option>
            <Option value="asc">升序</Option>
          </Select>
          <Button onClick={handleResetFilters}>重置筛选</Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize });
            },
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 编辑用户 Modal */}
      <Modal
        title="编辑用户"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '请输入有效的邮箱' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="nickname" label="昵称">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value={1}>正常</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 重置密码 Modal */}
      <Modal
        title="重置密码"
        open={passwordModalVisible}
        onOk={handlePasswordSubmit}
        onCancel={() => setPasswordModalVisible(false)}
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度至少 6 位' },
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
