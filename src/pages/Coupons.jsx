import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminCouponsAPI, usersAPI } from '../api';

const { Title } = Typography;

const Coupons = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState(undefined);

  const [editVisible, setEditVisible] = useState(false);
  const [grantVisible, setGrantVisible] = useState(false);
  const [grantsVisible, setGrantsVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [grantCouponId, setGrantCouponId] = useState(null);
  const [editForm] = Form.useForm();
  const [grantForm] = Form.useForm();
  const [grantMode, setGrantMode] = useState('single');
  const [userOptions, setUserOptions] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [grantsLoading, setGrantsLoading] = useState(false);
  const [grantRecords, setGrantRecords] = useState([]);
  const [grantPagination, setGrantPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUsers, setPreviewUsers] = useState([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewSignature, setPreviewSignature] = useState('');

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await adminCouponsAPI.getList({
        page: pagination.current,
        limit: pagination.pageSize,
        keyword: keyword || undefined,
        status,
      });
      setList(res?.data?.coupons || []);
      setPagination((prev) => ({
        ...prev,
        current: res?.data?.pagination?.page || prev.current,
        pageSize: res?.data?.pagination?.limit || prev.pageSize,
        total: res?.data?.pagination?.total || 0,
      }));
    } catch (error) {
      message.error('加载优惠券失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [pagination.current, pagination.pageSize, keyword, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    editForm.resetFields();
    editForm.setFieldsValue({
      discount_type: 'fixed',
      min_amount: 0,
      total_count: 0,
      per_user_limit: 1,
      status: 1
    });
    setEditVisible(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    editForm.setFieldsValue({
      ...row,
      status: Number(row.status) ? 1 : 0
    });
    setEditVisible(true);
  };

  const submitEdit = async () => {
    try {
      const values = await editForm.validateFields();
      if (editing) {
        await adminCouponsAPI.update(editing.id, values);
        message.success('更新成功');
      } else {
        await adminCouponsAPI.create(values);
        message.success('创建成功');
      }
      setEditVisible(false);
      fetchList();
    } catch (error) {
      message.error('保存失败：' + (error.response?.data?.message || error.message));
    }
  };

  const removeCoupon = async (id) => {
    try {
      await adminCouponsAPI.delete(id);
      message.success('删除成功');
      fetchList();
    } catch (error) {
      message.error('删除失败：' + (error.response?.data?.message || error.message));
    }
  };

  const openGrant = (id) => {
    setGrantCouponId(id);
    grantForm.resetFields();
    setGrantMode('single');
    setUserOptions([]);
    setPreviewUsers([]);
    setPreviewTotal(0);
    setPreviewSignature('');
    setGrantVisible(true);
  };

  const invalidateFilterPreview = () => {
    if (grantMode !== 'filter') return;
    setPreviewUsers([]);
    setPreviewTotal(0);
    setPreviewSignature('');
  };

  const searchUsers = async (kw) => {
    try {
      setUserSearchLoading(true);
      const res = await usersAPI.getList({ keyword: kw || undefined, page: 1, limit: 20 });
      const users = res?.data?.users || [];
      setUserOptions(users.map((u) => ({
        value: Number(u.id),
        label: `${u.username}${u.nickname ? ` (${u.nickname})` : ''} [ID:${u.id}]`
      })));
    } catch (error) {
      message.error('搜索用户失败：' + (error.response?.data?.message || error.message));
    } finally {
      setUserSearchLoading(false);
    }
  };

  const submitGrant = async () => {
    try {
      const values = await grantForm.validateFields();
      if (grantMode === 'single') {
        await adminCouponsAPI.grantToUser(grantCouponId, Number(values.user_id));
        message.success('发放成功');
      } else if (grantMode === 'batch') {
        const ids = Array.isArray(values.user_ids) ? values.user_ids.map((x) => Number(x)).filter((x) => x > 0) : [];
        const res = await adminCouponsAPI.grantBatch(grantCouponId, ids);
        const inserted = res?.data?.inserted_count ?? 0;
        message.success(`批量发放完成，成功 ${inserted} 条`);
      } else {
        const payload = {
          keyword: values.keyword || undefined,
          status: values.status,
          role: values.role,
          created_from: values.created_from || undefined,
          created_to: values.created_to || undefined,
          limit: values.limit || 500
        };
        const currentSignature = JSON.stringify(payload);
        if (!previewSignature || currentSignature !== previewSignature) {
          message.warning('按筛选发放前，请先点击“预览命中用户”，且预览后不要修改筛选条件');
          return;
        }
        const summary = [
          `关键词：${payload.keyword || '无'}`,
          `用户状态：${payload.status === 1 ? '正常' : payload.status === 0 ? '禁用' : '全部'}`,
          `角色：${payload.role || '全部'}`,
          `注册区间：${payload.created_from || '-'} ~ ${payload.created_to || '-'}`,
          `最大处理人数：${payload.limit}`,
          `预览命中总数：${previewTotal || 0}`
        ].join('\n');

        await new Promise((resolve, reject) => {
          Modal.confirm({
            title: '确认按筛选条件批量发放？',
            content: (
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {summary}
              </div>
            ),
            okText: '确认发放',
            cancelText: '取消',
            onOk: async () => {
              try {
                const res = await adminCouponsAPI.grantByFilter(grantCouponId, payload);
                const matched = res?.data?.matched_count ?? 0;
                const inserted = res?.data?.inserted_count ?? 0;
                message.success(`筛选发放完成：匹配 ${matched} 人，成功新增 ${inserted} 条`);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            onCancel: () => reject(new Error('用户取消操作'))
          });
        });
      }
      setGrantVisible(false);
    } catch (error) {
      if (error?.message === '用户取消操作') return;
      message.error('发放失败：' + (error.response?.data?.message || error.message));
    }
  };

  const previewGrantTargets = async () => {
    try {
      const values = await grantForm.validateFields();
      if (grantMode !== 'filter') {
        message.info('预览仅适用于按条件筛选发放');
        return;
      }
      setPreviewLoading(true);
      const payload = {
        keyword: values.keyword || undefined,
        status: values.status,
        role: values.role,
        created_from: values.created_from || undefined,
        created_to: values.created_to || undefined,
        limit: values.limit || 200
      };
      const signature = JSON.stringify(payload);
      const res = await adminCouponsAPI.previewGrantByFilter(grantCouponId, payload);
      const users = res?.data?.users || [];
      setPreviewUsers(users);
      setPreviewTotal(Number(res?.data?.total || users.length || 0));
      setPreviewSignature(signature);
      message.success(`预览完成：命中 ${Number(res?.data?.total || 0)} 人`);
    } catch (error) {
      message.error('预览失败：' + (error.response?.data?.message || error.message));
    } finally {
      setPreviewLoading(false);
    }
  };

  const openGrantRecords = async (couponId) => {
    setGrantCouponId(couponId);
    setGrantsVisible(true);
    setGrantPagination((prev) => ({ ...prev, current: 1 }));
  };

  const fetchGrantRecords = async (couponId, page = 1, limit = 10) => {
    try {
      setGrantsLoading(true);
      const res = await adminCouponsAPI.getGrants(couponId, { page, limit });
      const records = res?.data?.grants || [];
      setGrantRecords(records);
      setGrantPagination({
        current: res?.data?.pagination?.page || page,
        pageSize: res?.data?.pagination?.limit || limit,
        total: res?.data?.pagination?.total || 0
      });
    } catch (error) {
      message.error('加载发放记录失败：' + (error.response?.data?.message || error.message));
    } finally {
      setGrantsLoading(false);
    }
  };

  useEffect(() => {
    if (grantsVisible && grantCouponId) {
      fetchGrantRecords(grantCouponId, grantPagination.current, grantPagination.pageSize);
    }
  }, [grantsVisible, grantCouponId, grantPagination.current, grantPagination.pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '券码', dataIndex: 'code', width: 140 },
    { title: '名称', dataIndex: 'name', width: 180, ellipsis: true },
    {
      title: '类型',
      dataIndex: 'discount_type',
      width: 100,
      render: (v) => (v === 'percent' ? '折扣' : '满减')
    },
    {
      title: '面额',
      dataIndex: 'discount_value',
      width: 100,
      render: (v, r) => (r.discount_type === 'percent' ? `${v}%` : `¥${v}`)
    },
    { title: '门槛', dataIndex: 'min_amount', width: 100, render: (v) => `¥${v}` },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v) => <Tag color={Number(v) ? 'green' : 'red'}>{Number(v) ? '启用' : '停用'}</Tag>
    },
    {
      title: '有效期',
      key: 'valid',
      width: 300,
      render: (_, r) => `${r.valid_from ? dayjs(r.valid_from).format('YYYY-MM-DD HH:mm') : '-'} ~ ${r.valid_until ? dayjs(r.valid_until).format('YYYY-MM-DD HH:mm') : '-'}`,
    },
    {
      title: '操作',
      key: 'action',
      width: 360,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>编辑</Button>
          <Button size="small" onClick={() => openGrant(row.id)}>发放给用户</Button>
          <Button size="small" onClick={() => openGrantRecords(row.id)}>发放记录</Button>
          <Popconfirm title="确认删除该优惠券？" onConfirm={() => removeCoupon(row.id)}>
            <Button danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>🎫 优惠券管理</Title>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="按券码/名称搜索"
            style={{ width: 240 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => setPagination((prev) => ({ ...prev, current: 1 }))}
          />
          <Select
            placeholder="状态"
            style={{ width: 120 }}
            allowClear
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          >
            <Select.Option value={1}>启用</Select.Option>
            <Select.Option value={0}>停用</Select.Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增优惠券</Button>
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={list}
          columns={columns}
          scroll={{ x: 1400 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => setPagination((prev) => ({ ...prev, current: page, pageSize })),
          }}
        />
      </Card>

      <Modal
        title={editing ? '编辑优惠券' : '新增优惠券'}
        open={editVisible}
        onCancel={() => setEditVisible(false)}
        onOk={submitEdit}
        width={760}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="code" label="券码" rules={[{ required: true, message: '请输入券码' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="discount_type" label="优惠类型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="fixed">满减</Select.Option>
              <Select.Option value="percent">折扣(%)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="discount_value" label="优惠值" rules={[{ required: true, message: '请输入优惠值' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="min_amount" label="最低消费金额">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="max_discount" label="折扣上限（折扣券可选）">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="total_count" label="发放总量（0=不限）">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="per_user_limit" label="每人限领">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="valid_from" label="开始时间（YYYY-MM-DD HH:mm:ss）">
            <Input />
          </Form.Item>
          <Form.Item name="valid_until" label="结束时间（YYYY-MM-DD HH:mm:ss）">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select>
              <Select.Option value={1}>启用</Select.Option>
              <Select.Option value={0}>停用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="发放优惠券给用户"
        open={grantVisible}
        onCancel={() => {
          setGrantVisible(false);
          setPreviewUsers([]);
          setPreviewTotal(0);
          setPreviewSignature('');
        }}
        onOk={submitGrant}
        okText={grantMode === 'filter' ? '确认按筛选发放' : '确认发放'}
      >
        <Form form={grantForm} layout="vertical">
          <Form.Item label="发放方式">
            <Select value={grantMode} onChange={(v) => {
              setGrantMode(v);
              setPreviewUsers([]);
              setPreviewTotal(0);
              setPreviewSignature('');
            }}>
              <Select.Option value="single">单用户发放</Select.Option>
              <Select.Option value="batch">批量发放</Select.Option>
              <Select.Option value="filter">按条件筛选发放</Select.Option>
            </Select>
          </Form.Item>
          {grantMode === 'single' ? (
            <Form.Item name="user_id" label="选择用户" rules={[{ required: true, message: '请选择用户' }]}>
              <Select
                showSearch
                filterOption={false}
                onSearch={searchUsers}
                notFoundContent={userSearchLoading ? '搜索中...' : '无匹配用户'}
                options={userOptions}
                placeholder="输入用户名搜索并选择"
              />
            </Form.Item>
          ) : grantMode === 'batch' ? (
            <Form.Item name="user_ids" label="选择多个用户" rules={[{ required: true, message: '请选择至少一个用户' }]}>
              <Select
                mode="multiple"
                showSearch
                filterOption={false}
                onSearch={searchUsers}
                notFoundContent={userSearchLoading ? '搜索中...' : '无匹配用户'}
                options={userOptions}
                placeholder="输入用户名搜索，可多选"
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item name="keyword" label="关键词（用户名/昵称/邮箱）">
                <Input placeholder="可选，如 test / admin@xx.com" onChange={invalidateFilterPreview} />
              </Form.Item>
              <Form.Item name="status" label="用户状态">
                <Select allowClear placeholder="可选" onChange={invalidateFilterPreview}>
                  <Select.Option value={1}>正常</Select.Option>
                  <Select.Option value={0}>禁用</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="role" label="用户角色">
                <Select allowClear placeholder="可选" onChange={invalidateFilterPreview}>
                  <Select.Option value="user">普通用户</Select.Option>
                  <Select.Option value="admin">管理员</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="created_from" label="注册开始时间">
                <Input placeholder="YYYY-MM-DD HH:mm:ss（可选）" onChange={invalidateFilterPreview} />
              </Form.Item>
              <Form.Item name="created_to" label="注册结束时间">
                <Input placeholder="YYYY-MM-DD HH:mm:ss（可选）" onChange={invalidateFilterPreview} />
              </Form.Item>
              <Form.Item name="limit" label="最大处理人数">
                <InputNumber min={1} max={2000} style={{ width: '100%' }} placeholder="默认500" onChange={invalidateFilterPreview} />
              </Form.Item>
              <Form.Item>
                <Button onClick={previewGrantTargets} loading={previewLoading}>
                  预览命中用户
                </Button>
              </Form.Item>
              {grantMode === 'filter' && (
                <Card size="small" title={`命中预览（总命中：${previewTotal}，展示前 ${previewUsers.length} 条）`}>
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    loading={previewLoading}
                    dataSource={previewUsers}
                    columns={[
                      { title: '用户ID', dataIndex: 'id', width: 80 },
                      { title: '用户名', dataIndex: 'username', width: 120 },
                      { title: '昵称', dataIndex: 'nickname', width: 120, render: (v) => v || '-' },
                      { title: '邮箱', dataIndex: 'email', width: 180, render: (v) => v || '-' },
                      { title: '角色', dataIndex: 'role', width: 80 },
                      { title: '状态', dataIndex: 'status', width: 70, render: (v) => (Number(v) ? '正常' : '禁用') },
                    ]}
                    scroll={{ x: 700, y: 240 }}
                  />
                </Card>
              )}
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title={`优惠券发放记录（券ID: ${grantCouponId || '-'}）`}
        open={grantsVisible}
        onCancel={() => setGrantsVisible(false)}
        footer={null}
        width={920}
      >
        <Table
          rowKey="id"
          loading={grantsLoading}
          dataSource={grantRecords}
          size="small"
          columns={[
            { title: '记录ID', dataIndex: 'id', width: 90 },
            { title: '用户ID', dataIndex: 'user_id', width: 90 },
            { title: '用户名', dataIndex: 'username', width: 140, render: (v, r) => v || r.nickname || '-' },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (v) => (
                <Tag color={v === 'used' ? 'green' : v === 'expired' ? 'red' : 'blue'}>
                  {v}
                </Tag>
              )
            },
            { title: '关联订单', dataIndex: 'order_id', width: 100, render: (v) => v || '-' },
            { title: '使用时间', dataIndex: 'used_at', width: 170, render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-') },
            { title: '发放时间', dataIndex: 'created_at', width: 170, render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-') },
          ]}
          pagination={{
            ...grantPagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => setGrantPagination((prev) => ({ ...prev, current: page, pageSize }))
          }}
        />
      </Modal>
    </div>
  );
};

export default Coupons;

